import type { SessionUser } from '~/types'

interface AuthState {
  user: SessionUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

const authState = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
})

export function useAuth() {
  const router = useRouter()

  async function fetchSession() {
    authState.isLoading = true
    try {
      const response = await $fetch<{ user: SessionUser | null }>('/api/auth/session')
      if (response.user) {
        authState.user = response.user
        authState.isAuthenticated = true
      } else {
        authState.user = null
        authState.isAuthenticated = false
      }
    } catch {
      authState.user = null
      authState.isAuthenticated = false
    } finally {
      authState.isLoading = false
    }
  }

  async function login(username: string, password: string) {
    const response = await $fetch<{ user: SessionUser; success: boolean }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })

    if (response.success && response.user) {
      authState.user = response.user
      authState.isAuthenticated = true
      return { success: true }
    }

    return { success: false, error: 'Invalid credentials' }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      authState.user = null
      authState.isAuthenticated = false
      router.push('/login')
    }
  }

  function isAdmin() {
    return authState.user?.role === 'admin'
  }

  return {
    user: computed(() => authState.user),
    isAuthenticated: computed(() => authState.isAuthenticated),
    isLoading: computed(() => authState.isLoading),
    isAdmin,
    fetchSession,
    login,
    logout,
  }
}
