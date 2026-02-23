import type { CaseDetail, CaseListItem } from '~/types'

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
  cases: CaseListItem[]
  skipToken?: string
  hasMore: boolean
  pageSize: number
}

interface StatusReasonOption {
  value: number
  label: string
  state: number
}

export function useAdminCases() {
  const users = ref<UserWithDynamics[]>([])
  const cases = ref<CaseListItem[]>([])
  const skipToken = ref<string | null>(null)
  const skipTokenHistory = ref<string[]>([])
  const hasMore = ref(false)
  const pageSize = ref(20)
  const loading = ref(false)
  const isRefreshing = ref(false)
  const error = ref('')
  const statusReasonOptions = ref<StatusReasonOption[]>([])

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
  }, options?: { forceRefresh?: boolean }) {
    const isForceRefresh = options?.forceRefresh ?? false

    if (isForceRefresh) {
      isRefreshing.value = true
    } else {
      loading.value = true
    }
    error.value = ''

    try {
      const response = await $fetch<CasesResponse>('/api/cases', {
        params: {
          userId,
          ...params,
          ...(isForceRefresh ? { _noCache: '1' } : {}),
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
      isRefreshing.value = false
    }
  }

  async function forceRefreshUserCases(userId: string, params?: {
    skipToken?: string
    pageSize?: number
    status?: string
    statusReason?: string
    priority?: string
    search?: string
    orderBy?: string
    orderDirection?: string
  }) {
    return fetchUserCases(userId, params, { forceRefresh: true })
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
      skipToken.value = null
      await fetchUserCases(userId, {
        pageSize: pageSize.value,
        ...filters,
      })
      return
    }

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

  async function fetchCaseDetails(userId: string, caseId: string, options?: { forceRefresh?: boolean }) {
    loading.value = true
    error.value = ''

    try {
      const params = options?.forceRefresh
        ? { userId, _noCache: '1' }
        : { userId }
      const response = await $fetch<CaseDetail>(`/api/cases/${caseId}`, {
        params,
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

  return {
    users: readonly(users),
    cases: readonly(cases),
    hasMore: readonly(hasMore),
    pageSize: readonly(pageSize),
    loading: readonly(loading),
    isRefreshing: readonly(isRefreshing),
    error: readonly(error),
    statusReasonOptions: readonly(statusReasonOptions),
    canGoBack,
    resetPagination,
    fetchUsersWithDynamics,
    fetchUserCases,
    forceRefreshUserCases,
    fetchNextPage,
    fetchPreviousPage,
    fetchCaseDetails,
    fetchStatusReasonOptions,
  }
}
