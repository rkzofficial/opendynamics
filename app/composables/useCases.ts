import type { Case, CasesResponse, CaseFilters, ActivitiesResponse } from '~/types'

interface CasesState {
  cases: Case[]
  currentCase: Case | null
  activities: ActivitiesResponse | null
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  isLoadingActivities: boolean
  filters: CaseFilters
}

const casesState = reactive<CasesState>({
  cases: [],
  currentCase: null,
  activities: null,
  total: 0,
  page: 1,
  pageSize: 20,
  isLoading: false,
  isLoadingActivities: false,
  filters: {},
})

export function useCases() {
  async function fetchCases(filters?: CaseFilters) {
    casesState.isLoading = true
    try {
      const params = new URLSearchParams()

      const mergedFilters = { ...casesState.filters, ...filters }

      if (mergedFilters.status) params.set('status', mergedFilters.status)
      if (mergedFilters.priority) params.set('priority', mergedFilters.priority)
      if (mergedFilters.search) params.set('search', mergedFilters.search)
      if (mergedFilters.dateFrom) params.set('dateFrom', mergedFilters.dateFrom)
      if (mergedFilters.dateTo) params.set('dateTo', mergedFilters.dateTo)
      if (mergedFilters.page) params.set('page', String(mergedFilters.page))
      if (mergedFilters.pageSize) params.set('pageSize', String(mergedFilters.pageSize))
      if (mergedFilters.orderBy) params.set('orderBy', mergedFilters.orderBy)
      if (mergedFilters.orderDirection) params.set('orderDirection', mergedFilters.orderDirection)

      const response = await $fetch<CasesResponse>(`/api/cases?${params.toString()}`)

      casesState.cases = response.cases
      casesState.total = response.total
      casesState.page = response.page
      casesState.pageSize = response.pageSize
      casesState.filters = mergedFilters
    } catch (error) {
      console.error('Failed to fetch cases:', error)
      casesState.cases = []
    } finally {
      casesState.isLoading = false
    }
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

  function setFilters(filters: CaseFilters) {
    casesState.filters = { ...casesState.filters, ...filters }
  }

  function clearFilters() {
    casesState.filters = {}
  }

  function setPage(page: number) {
    casesState.filters.page = page
  }

  return {
    cases: computed(() => casesState.cases),
    currentCase: computed(() => casesState.currentCase),
    activities: computed(() => casesState.activities),
    total: computed(() => casesState.total),
    page: computed(() => casesState.page),
    pageSize: computed(() => casesState.pageSize),
    isLoading: computed(() => casesState.isLoading),
    isLoadingActivities: computed(() => casesState.isLoadingActivities),
    filters: computed(() => casesState.filters),
    fetchCases,
    fetchCase,
    fetchActivities,
    addReply,
    setFilters,
    clearFilters,
    setPage,
  }
}
