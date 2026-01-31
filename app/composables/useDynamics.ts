import type { DynamicsConnectionStatus, DeviceCodeResponse } from '~/types'

interface DynamicsState {
  connectionStatus: DynamicsConnectionStatus | null
  isConnecting: boolean
  isLoading: boolean
  deviceCode: DeviceCodeResponse | null
}

const dynamicsState = reactive<DynamicsState>({
  connectionStatus: null,
  isConnecting: false,
  isLoading: true,
  deviceCode: null,
})

export function useDynamics() {
  async function fetchConnectionStatus() {
    dynamicsState.isLoading = true
    try {
      const response = await $fetch<DynamicsConnectionStatus>('/api/dynamics/status')
      dynamicsState.connectionStatus = response
    } catch {
      dynamicsState.connectionStatus = { connected: false }
    } finally {
      dynamicsState.isLoading = false
    }
  }

  async function startDeviceCodeFlow() {
    dynamicsState.isConnecting = true
    try {
      const response = await $fetch<DeviceCodeResponse>('/api/dynamics/connect', {
        method: 'POST',
      })
      dynamicsState.deviceCode = response
      return response
    } catch (error) {
      dynamicsState.isConnecting = false
      throw error
    }
  }

  async function pollForToken(deviceCode: string) {
    try {
      const response = await $fetch<{ success: boolean; status?: DynamicsConnectionStatus }>('/api/dynamics/poll-token', {
        method: 'POST',
        body: { deviceCode },
      })

      if (response.success && response.status) {
        dynamicsState.connectionStatus = response.status
        dynamicsState.deviceCode = null
        dynamicsState.isConnecting = false
        return { success: true }
      }

      return { success: false, pending: true }
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } }
      if (err.data?.message === 'authorization_pending') {
        return { success: false, pending: true }
      }
      dynamicsState.isConnecting = false
      throw error
    }
  }

  async function disconnect() {
    await $fetch('/api/dynamics/disconnect', { method: 'POST' })
    dynamicsState.connectionStatus = { connected: false }
    dynamicsState.deviceCode = null
  }

  function cancelConnect() {
    dynamicsState.deviceCode = null
    dynamicsState.isConnecting = false
  }

  return {
    connectionStatus: computed(() => dynamicsState.connectionStatus),
    isConnecting: computed(() => dynamicsState.isConnecting),
    isLoading: computed(() => dynamicsState.isLoading),
    deviceCode: computed(() => dynamicsState.deviceCode),
    fetchConnectionStatus,
    startDeviceCodeFlow,
    pollForToken,
    disconnect,
    cancelConnect,
  }
}
