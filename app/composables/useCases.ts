import type { Case, CasesResponse, CaseFilters, ActivitiesResponse, SLAKPIsResponse, StatusReasonOption } from '~/types'

interface CasesState {
  cases: Case[]
  currentCase: Case | null
  activities: ActivitiesResponse | null
  slaKPIs: SLAKPIsResponse | null
  skipToken: string | null
  skipTokenHistory: string[]
  hasMore: boolean
  pageSize: number
  isLoading: boolean
  isLoadingActivities: boolean
  isLoadingSLAKPIs: boolean
  filters: CaseFilters
  statusReasonOptions: StatusReasonOption[]
}

const casesState = reactive<CasesState>({
  cases: [],
  currentCase: null,
  activities: null,
  slaKPIs: null,
  skipToken: null,
  skipTokenHistory: [],
  hasMore: false,
  pageSize: 20,
  isLoading: false,
  isLoadingActivities: false,
  isLoadingSLAKPIs: false,
  filters: {},
  statusReasonOptions: [],
})

export function useCases() {
  async function fetchCases(filters?: CaseFilters) {
    casesState.isLoading = true
    try {
      const params = new URLSearchParams()

      const mergedFilters = { ...casesState.filters, ...filters }

      if (mergedFilters.status) params.set('status', mergedFilters.status)
      if (mergedFilters.statusReason) params.set('statusReason', mergedFilters.statusReason)
      if (mergedFilters.priority) params.set('priority', mergedFilters.priority)
      if (mergedFilters.search) params.set('search', mergedFilters.search)
      if (mergedFilters.dateFrom) params.set('dateFrom', mergedFilters.dateFrom)
      if (mergedFilters.dateTo) params.set('dateTo', mergedFilters.dateTo)
      if (mergedFilters.skipToken) params.set('skipToken', mergedFilters.skipToken)
      if (mergedFilters.pageSize) params.set('pageSize', String(mergedFilters.pageSize))
      if (mergedFilters.orderBy) params.set('orderBy', mergedFilters.orderBy)
      if (mergedFilters.orderDirection) params.set('orderDirection', mergedFilters.orderDirection)

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
    }
  }

  async function fetchNextPage() {
    if (!casesState.skipToken) return

    // Save current skip token to history before navigating
    if (casesState.filters.skipToken) {
      casesState.skipTokenHistory.push(casesState.filters.skipToken)
    }

    await fetchCases({ skipToken: casesState.skipToken })
  }

  async function fetchPreviousPage() {
    if (casesState.skipTokenHistory.length === 0) {
      // Go back to first page
      await fetchCases({ skipToken: undefined })
      casesState.skipTokenHistory = []
      return
    }

    // Pop the previous skip token from history
    const previousSkipToken = casesState.skipTokenHistory.pop()
    await fetchCases({ skipToken: previousSkipToken })
  }

  async function fetchCase(id: string) {
    casesState.isLoading = true
    try {
      const response = await $fetch<Case>(`/api/cases/${id}`)
      casesState.currentCase = response
      return response
    } catch (error) {
      console.error('Failed to fetch case:', error)
      return null
    } finally {
      casesState.isLoading = false
    }
  }

  async function fetchActivities(caseId: string) {
    casesState.isLoadingActivities = true
    try {
      const response = await $fetch<ActivitiesResponse>(`/api/cases/${caseId}/activities`)
      casesState.activities = response
      return response
    } catch (error) {
      console.error('Failed to fetch activities:', error)
      return null
    } finally {
      casesState.isLoadingActivities = false
    }
  }

  async function fetchSLAKPIs(caseId: string) {
    casesState.isLoadingSLAKPIs = true
    try {
      const response = await $fetch<SLAKPIsResponse>(`/api/cases/${caseId}/sla-kpis`)
      casesState.slaKPIs = response
      return response
    } catch (error) {
      console.error('Failed to fetch SLA KPIs:', error)
      return null
    } finally {
      casesState.isLoadingSLAKPIs = false
    }
  }

  async function addReply(caseId: string, noteText: string, subject?: string) {
    try {
      await $fetch(`/api/cases/${caseId}/reply`, {
        method: 'POST',
        body: { noteText, subject },
      })
      // Refresh activities after adding reply
      await fetchActivities(caseId)
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
    activities: computed(() => casesState.activities),
    slaKPIs: computed(() => casesState.slaKPIs),
    skipToken: computed(() => casesState.skipToken),
    hasMore: computed(() => casesState.hasMore),
    pageSize: computed(() => casesState.pageSize),
    isLoading: computed(() => casesState.isLoading),
    isLoadingActivities: computed(() => casesState.isLoadingActivities),
    isLoadingSLAKPIs: computed(() => casesState.isLoadingSLAKPIs),
    filters: computed(() => casesState.filters),
    statusReasonOptions: computed(() => casesState.statusReasonOptions),
    canGoBack,
    fetchCases,
    fetchNextPage,
    fetchPreviousPage,
    fetchCase,
    fetchActivities,
    fetchSLAKPIs,
    fetchStatusReasonOptions,
    addReply,
    setFilters,
    clearFilters,
    setPageSize,
  }
}
