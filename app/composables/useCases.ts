import type { CaseListItem, CaseDetail, CasesResponse, CaseFilters, StatusReasonOption, SLASummary } from '~/types'

interface CasesState {
  cases: CaseListItem[]
  currentCase: CaseDetail | null
  skipToken: string | null
  skipTokenHistory: string[]
  hasMore: boolean
  pageSize: number
  isLoading: boolean
  isRefreshing: boolean
  isDownloadingAttachment: boolean
  isLoadingPreview: boolean
  filters: CaseFilters
  statusReasonOptions: StatusReasonOption[]
}

// Preview cache - stores blob URLs for attachments
const previewCache = new Map<string, string>()

const casesState = reactive<CasesState>({
  cases: [],
  currentCase: null,
  skipToken: null,
  skipTokenHistory: [],
  hasMore: false,
  pageSize: 20,
  isLoading: false,
  isRefreshing: false,
  isDownloadingAttachment: false,
  isLoadingPreview: false,
  filters: {},
  statusReasonOptions: [],
})

export function useCases() {
  async function fetchCases(filters?: CaseFilters, options?: { forceRefresh?: boolean }) {
    const isForceRefresh = options?.forceRefresh ?? false

    if (isForceRefresh) {
      casesState.isRefreshing = true
    } else {
      casesState.isLoading = true
    }

    try {
      const params = new URLSearchParams()

      const mergedFilters = { ...casesState.filters, ...filters }

      if (mergedFilters.status) params.set('status', mergedFilters.status)
      if (mergedFilters.statusReason) params.set('statusReason', mergedFilters.statusReason)
      if (mergedFilters.priority) params.set('priority', mergedFilters.priority)
      if (mergedFilters.dxPendingRelease) params.set('dxPendingRelease', 'true')
      if (mergedFilters.search) params.set('search', mergedFilters.search)
      if (mergedFilters.dateFrom) params.set('dateFrom', mergedFilters.dateFrom)
      if (mergedFilters.dateTo) params.set('dateTo', mergedFilters.dateTo)
      if (mergedFilters.skipToken) params.set('skipToken', mergedFilters.skipToken)
      if (mergedFilters.pageSize) params.set('pageSize', String(mergedFilters.pageSize))
      if (mergedFilters.orderBy) params.set('orderBy', mergedFilters.orderBy)
      if (mergedFilters.orderDirection) params.set('orderDirection', mergedFilters.orderDirection)

      if (isForceRefresh) {
        params.set('_noCache', '1')
      }

      const response = await $fetch<CasesResponse>(`/api/cases?${params.toString()}`)

      casesState.cases = response.cases
      casesState.skipToken = response.skipToken || null
      casesState.hasMore = response.hasMore
      casesState.pageSize = response.pageSize
      casesState.filters = mergedFilters
    } catch (error) {
      console.error('Failed to fetch cases:', error)
      casesState.cases = []
      casesState.skipToken = null
      casesState.hasMore = false
    } finally {
      casesState.isLoading = false
      casesState.isRefreshing = false
    }
  }

  async function forceRefresh(filters?: CaseFilters) {
    return fetchCases(filters, { forceRefresh: true })
  }

  async function fetchNextPage() {
    if (!casesState.skipToken) return

    if (casesState.filters.skipToken) {
      casesState.skipTokenHistory.push(casesState.filters.skipToken)
    }

    await fetchCases({ skipToken: casesState.skipToken })
  }

  async function fetchPreviousPage() {
    if (casesState.skipTokenHistory.length === 0) {
      await fetchCases({ skipToken: undefined })
      casesState.skipTokenHistory = []
      return
    }

    const previousSkipToken = casesState.skipTokenHistory.pop()
    await fetchCases({ skipToken: previousSkipToken })
  }

  async function fetchCase(id: string) {
    casesState.isLoading = true
    try {
      const response = await $fetch<CaseDetail>(`/api/cases/${id}`)
      casesState.currentCase = response
      return response
    } catch (error) {
      console.error('Failed to fetch case:', error)
      return null
    } finally {
      casesState.isLoading = false
    }
  }

  async function addReply(caseId: string, noteText: string, subject?: string) {
    try {
      await $fetch(`/api/cases/${caseId}/reply`, {
        method: 'POST',
        body: { noteText, subject },
      })
      // Refresh case to get updated activities
      await fetchCase(caseId)
      return { success: true }
    } catch (error) {
      console.error('Failed to add reply:', error)
      return { success: false, error: 'Failed to add reply' }
    }
  }

  async function fetchStatusReasonOptions() {
    try {
      const options = await $fetch<StatusReasonOption[]>('/api/cases/status-reasons')
      casesState.statusReasonOptions = options
      return options
    } catch (error) {
      console.error('Failed to fetch status reason options:', error)
      return []
    }
  }

  async function downloadAttachment(caseId: string, annotationId: string, filename: string) {
    casesState.isDownloadingAttachment = true
    try {
      const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
        `/api/cases/${caseId}/attachments/${annotationId}`
      )

      const byteCharacters = atob(response.documentbody)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: response.mimetype })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || response.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      console.error('Failed to download attachment:', error)
      return { success: false, error: 'Failed to download attachment' }
    } finally {
      casesState.isDownloadingAttachment = false
    }
  }

  async function getAttachmentPreviewUrl(caseId: string, annotationId: string): Promise<string | null> {
    const cacheKey = `${caseId}:${annotationId}`
    if (previewCache.has(cacheKey)) {
      return previewCache.get(cacheKey)!
    }

    casesState.isLoadingPreview = true
    try {
      const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
        `/api/cases/${caseId}/attachments/${annotationId}`
      )

      const byteCharacters = atob(response.documentbody)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: response.mimetype })

      const url = URL.createObjectURL(blob)
      previewCache.set(cacheKey, url)

      return url
    } catch (error) {
      console.error('Failed to get attachment preview:', error)
      return null
    } finally {
      casesState.isLoadingPreview = false
    }
  }

  function clearPreviewCache() {
    for (const url of previewCache.values()) {
      URL.revokeObjectURL(url)
    }
    previewCache.clear()
  }

  function setFilters(filters: CaseFilters) {
    casesState.filters = { ...casesState.filters, ...filters }
  }

  function clearFilters() {
    casesState.filters = {}
    casesState.skipToken = null
    casesState.skipTokenHistory = []
  }

  function setPageSize(size: number) {
    casesState.pageSize = size
    casesState.skipToken = null
    casesState.skipTokenHistory = []
    casesState.filters.skipToken = undefined
    fetchCases({ pageSize: size })
  }

  const canGoBack = computed(() => {
    return casesState.skipTokenHistory.length > 0 || casesState.filters.skipToken !== undefined
  })

  return {
    cases: computed(() => casesState.cases),
    currentCase: computed(() => casesState.currentCase),
    skipToken: computed(() => casesState.skipToken),
    hasMore: computed(() => casesState.hasMore),
    pageSize: computed(() => casesState.pageSize),
    isLoading: computed(() => casesState.isLoading),
    isRefreshing: computed(() => casesState.isRefreshing),
    isDownloadingAttachment: computed(() => casesState.isDownloadingAttachment),
    isLoadingPreview: computed(() => casesState.isLoadingPreview),
    filters: computed(() => casesState.filters),
    statusReasonOptions: computed(() => casesState.statusReasonOptions),
    canGoBack,
    fetchCases,
    forceRefresh,
    fetchNextPage,
    fetchPreviousPage,
    fetchCase,
    fetchStatusReasonOptions,
    addReply,
    downloadAttachment,
    getAttachmentPreviewUrl,
    clearPreviewCache,
    setFilters,
    clearFilters,
    setPageSize,
  }
}
