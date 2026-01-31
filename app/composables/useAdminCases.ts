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

export function useAdminCases() {
  const users = ref<UserWithDynamics[]>([])
  const cases = ref<any[]>([])
  const skipToken = ref<string | null>(null)
  const skipTokenHistory = ref<string[]>([])
  const hasMore = ref(false)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref('')

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

  async function fetchUserCases(userId: string, params?: {
    skipToken?: string
    pageSize?: number
    status?: string
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

  function canGoBack() {
    return skipTokenHistory.value.length > 0
  }

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

  return {
    users: readonly(users),
    cases: readonly(cases),
    hasMore: readonly(hasMore),
    pageSize: readonly(pageSize),
    loading: readonly(loading),
    error: readonly(error),
    canGoBack,
    resetPagination,
    fetchUsersWithDynamics,
    fetchUserCases,
    fetchNextPage,
    fetchPreviousPage,
    fetchCaseDetails,
  }
}
