interface UserWithDynamics {
  _id: string
  username: string
  name?: string
  email?: string
  role: string
  connected: boolean
  expiresAt: number
}

interface CasesResponse {
  cases: any[]
  skipToken?: string
  hasMore: boolean
  pageSize: number
}

interface SLAKPIsResponse {
  slakpis: any[]
}

interface CaseSLAInfo {
  createdon?: string
  warningtime?: string
  failuretime?: string
  status: number
}

interface BatchSLAResponse {
  slaData: Record<string, CaseSLAInfo>
}

interface StatusReasonOption {
  value: number
  label: string
  state: number
}

export function useAdminCases() {
  const users = ref<UserWithDynamics[]>([])
  const cases = ref<any[]>([])
  const skipToken = ref<string | null>(null)
  const skipTokenHistory = ref<string[]>([])
  const hasMore = ref(false)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref('')
  const slaKPIs = ref<SLAKPIsResponse | null>(null)
  const isLoadingSLAKPIs = ref(false)
  const statusReasonOptions = ref<StatusReasonOption[]>([])
  const caseSLAData = ref<Record<string, CaseSLAInfo>>({})
  const isLoadingBatchSLA = ref(false)

  async function fetchUsersWithDynamics() {
    loading.value = true
    error.value = ''

    try {
      const response = await $fetch<UserWithDynamics[]>('/api/admin/users/with-dynamics')
      users.value = response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Failed to fetch users'
    } finally {
      loading.value = false
    }
  }

  async function fetchStatusReasonOptions(userId: string) {
    try {
      const options = await $fetch<StatusReasonOption[]>('/api/cases/status-reasons', {
        params: { userId },
      })
      statusReasonOptions.value = options
      return options
    } catch (e) {
      console.error('Failed to fetch status reason options:', e)
      return []
    }
  }

  async function fetchUserCases(userId: string, params?: {
    skipToken?: string
    pageSize?: number
    status?: string
    statusReason?: string
    priority?: string
    search?: string
    orderBy?: string
    orderDirection?: string
  }) {
    loading.value = true
    error.value = ''

    try {
      const response = await $fetch<CasesResponse>('/api/cases', {
        params: {
          userId,
          ...params,
        },
      })
      cases.value = response.cases
      skipToken.value = response.skipToken || null
      hasMore.value = response.hasMore
      pageSize.value = response.pageSize
      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Failed to fetch cases'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchNextPage(userId: string, filters?: {
    status?: string
    statusReason?: string
    priority?: string
    search?: string
    orderBy?: string
    orderDirection?: string
  }) {
    if (!skipToken.value) return

    // Save current skip token to history before navigating
    skipTokenHistory.value.push(skipToken.value)

    await fetchUserCases(userId, {
      skipToken: skipToken.value,
      pageSize: pageSize.value,
      ...filters,
    })
  }

  async function fetchPreviousPage(userId: string, filters?: {
    status?: string
    statusReason?: string
    priority?: string
    search?: string
    orderBy?: string
    orderDirection?: string
  }) {
    if (skipTokenHistory.value.length === 0) {
      // Go back to first page
      skipToken.value = null
      await fetchUserCases(userId, {
        pageSize: pageSize.value,
        ...filters,
      })
      return
    }

    // Pop the previous skip token from history
    const previousSkipToken = skipTokenHistory.value.pop()
    await fetchUserCases(userId, {
      skipToken: previousSkipToken,
      pageSize: pageSize.value,
      ...filters,
    })
  }

  const canGoBack = computed(() => {
    return skipTokenHistory.value.length > 0
  })

  function resetPagination() {
    skipToken.value = null
    skipTokenHistory.value = []
  }

  async function fetchCaseDetails(userId: string, caseId: string) {
    loading.value = true
    error.value = ''

    try {
      const response = await $fetch(`/api/cases/${caseId}`, {
        params: { userId },
      })
      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Failed to fetch case details'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSLAKPIs(userId: string, caseId: string) {
    isLoadingSLAKPIs.value = true
    try {
      const response = await $fetch<SLAKPIsResponse>(`/api/cases/${caseId}/sla-kpis`, {
        params: { userId },
      })
      slaKPIs.value = response
      return response
    } catch (e: unknown) {
      console.error('Failed to fetch SLA KPIs:', e)
      slaKPIs.value = null
      return null
    } finally {
      isLoadingSLAKPIs.value = false
    }
  }

  async function fetchBatchSLAData(userId: string, caseIds: string[]) {
    if (caseIds.length === 0) {
      caseSLAData.value = {}
      return
    }

    isLoadingBatchSLA.value = true
    try {
      const response = await $fetch<BatchSLAResponse>(
        `/api/cases/sla-batch?userId=${userId}&caseIds=${caseIds.join(',')}`
      )
      caseSLAData.value = response.slaData
    } catch (e: unknown) {
      console.error('Failed to fetch batch SLA data:', e)
      caseSLAData.value = {}
    } finally {
      isLoadingBatchSLA.value = false
    }
  }

  return {
    users: readonly(users),
    cases: readonly(cases),
    slaKPIs: readonly(slaKPIs),
    caseSLAData: readonly(caseSLAData),
    hasMore: readonly(hasMore),
    pageSize: readonly(pageSize),
    loading: readonly(loading),
    isLoadingSLAKPIs: readonly(isLoadingSLAKPIs),
    isLoadingBatchSLA: readonly(isLoadingBatchSLA),
    error: readonly(error),
    statusReasonOptions: readonly(statusReasonOptions),
    canGoBack,
    resetPagination,
    fetchUsersWithDynamics,
    fetchUserCases,
    fetchNextPage,
    fetchPreviousPage,
    fetchCaseDetails,
    fetchSLAKPIs,
    fetchBatchSLAData,
    fetchStatusReasonOptions,
  }
}
