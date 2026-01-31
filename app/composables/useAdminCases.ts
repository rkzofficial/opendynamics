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
  total: number
  page: number
  pageSize: number
}

export function useAdminCases() {
  const users = ref<UserWithDynamics[]>([])
  const cases = ref<any[]>([])
  const totalCases = ref(0)
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
    page?: number
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
      totalCases.value = response.total
      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Failed to fetch cases'
      throw e
    } finally {
      loading.value = false
    }
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
    totalCases: readonly(totalCases),
    loading: readonly(loading),
    error: readonly(error),
    fetchUsersWithDynamics,
    fetchUserCases,
    fetchCaseDetails,
  }
}
