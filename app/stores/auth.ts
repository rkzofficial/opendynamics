import { defineStore } from 'pinia'
import type { SessionUser } from '~/types'

interface AuthState {
  user: SessionUser | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isLoading: true,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    setUser(user: SessionUser | null) {
      this.user = user
    },

    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    async fetchSession() {
      this.isLoading = true
      try {
        const response = await $fetch<{ user: SessionUser | null }>('/api/auth/session')
        this.user = response.user
      } catch {
        this.user = null
      } finally {
        this.isLoading = false
      }
    },

    async login(username: string, password: string) {
      const response = await $fetch<{ user: SessionUser; success: boolean }>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })

      if (response.success && response.user) {
        this.user = response.user
        return { success: true }
      }

      return { success: false, error: 'Invalid credentials' }
    },

    async logout() {
      try {
        await $fetch('/api/auth/logout', { method: 'POST' })
      } finally {
        this.user = null
      }
    },
  },
})
