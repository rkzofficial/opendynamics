import { ref, computed } from 'vue'

export type NotificationPermission = 'default' | 'granted' | 'denied'

interface NotificationOptions {
  title: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  actions?: NotificationAction[]
  data?: unknown
}

export function useNotifications() {
  const permission = ref<NotificationPermission>('default')
  const isSupported = ref(false)
  const isSubscribed = ref(false)

  // Check if notifications are supported
  if (import.meta.client) {
    isSupported.value = 'Notification' in window && 'serviceWorker' in navigator
    if (isSupported.value) {
      permission.value = Notification.permission as NotificationPermission
    }
  }

  const canNotify = computed(() => 
    isSupported.value && permission.value === 'granted'
  )

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported.value) return false
    
    try {
      const result = await Notification.requestPermission()
      permission.value = result as NotificationPermission
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const showNotification = async (options: NotificationOptions): Promise<void> => {
    if (!canNotify.value) return

    try {
      const registration = await navigator.serviceWorker.ready
      
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-96x96.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        actions: options.actions,
        data: options.data,
      })
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  }

  const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!canNotify.value) return null

    try {
      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      
      isSubscribed.value = true
      return subscription
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }

  const unsubscribeFromPush = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        isSubscribed.value = false
        return true
      }
      return false
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  const getPushSubscription = async (): Promise<PushSubscription | null> => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
      return subscription
    } catch (error) {
      console.error('Error getting push subscription:', error)
      return null
    }
  }

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
  }

  return {
    isSupported,
    permission,
    canNotify,
    isSubscribed,
    requestPermission,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
    getPushSubscription,
  }
}
