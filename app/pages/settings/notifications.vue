<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Bell, Smartphone, Download, AlertCircle } from 'lucide-vue-next'
import { useNotifications } from '~/composables/useNotifications'

const { 
  isSupported, 
  permission, 
  canNotify, 
  isSubscribed,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
} = useNotifications()

const isLoading = ref(false)
const showTestNotification = async () => {
  const { showNotification } = useNotifications()
  await showNotification({
    title: 'Test Notification',
    body: 'This is a test notification from OpenDynamics!',
    tag: 'test-notification',
  })
}

const handleSubscribe = async () => {
  isLoading.value = true
  try {
    const config = useRuntimeConfig()
    const vapidPublicKey = config.public.vapidPublicKey
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured')
      return
    }
    await subscribeToPush(vapidPublicKey)
  } finally {
    isLoading.value = false
  }
}

const handleUnsubscribe = async () => {
  isLoading.value = true
  try {
    await unsubscribeFromPush()
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await getPushSubscription()
})
</script>

<template>
  <div class="container max-w-2xl py-6 space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
      <p class="text-muted-foreground">
        Manage your notification preferences and PWA settings.
      </p>
    </div>

    <!-- Browser Notifications Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-2">
          <Bell class="h-5 w-5 text-primary" />
          <UiCardTitle>Browser Notifications</UiCardTitle>
        </div>
        <UiCardDescription>
          Receive notifications even when the app is not open.
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <div v-if="!isSupported" class="text-sm text-muted-foreground">
          Your browser doesn't support notifications.
        </div>

        <template v-else>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Notification Permission</p>
              <p class="text-sm text-muted-foreground capitalize">
                Status: {{ permission }}
              </p>
            </div>
            <UiButton
              v-if="permission === 'default'"
              @click="requestPermission"
            >
              Enable Notifications
            </UiButton>
            <UiButton
              v-else-if="permission === 'granted'"
              variant="outline"
              @click="showTestNotification"
            >
              Send Test
            </UiButton>
            <UiButton
              v-else
              variant="outline"
              disabled
            >
              Blocked
            </UiButton>
          </div>

          <UiAlert v-if="permission === 'denied'" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <UiAlertDescription>
              Notifications are blocked. Please enable them in your browser settings.
            </UiAlertDescription>
          </UiAlert>
        </template>
      </UiCardContent>
    </UiCard>

    <!-- Push Notifications Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-2">
          <Smartphone class="h-5 w-5 text-primary" />
          <UiCardTitle>Push Notifications</UiCardTitle>
        </div>
        <UiCardDescription>
          Subscribe to receive push notifications on this device.
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Push Subscription</p>
            <p class="text-sm text-muted-foreground">
              {{ isSubscribed ? 'Subscribed to push notifications' : 'Not subscribed' }}
            </p>
          </div>
          <UiButton
            v-if="!isSubscribed"
            :disabled="!canNotify || isLoading"
            :loading="isLoading"
            @click="handleSubscribe"
          >
            Subscribe
          </UiButton>
          <UiButton
            v-else
            variant="outline"
            :loading="isLoading"
            @click="handleUnsubscribe"
          >
            Unsubscribe
          </UiButton>
        </div>

        <UiAlert v-if="!canNotify && permission !== 'denied'">
          <AlertCircle class="h-4 w-4" />
          <UiAlertDescription>
            Enable browser notifications first to subscribe to push notifications.
          </UiAlertDescription>
        </UiAlert>
      </UiCardContent>
    </UiCard>

    <!-- App Installation Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-2">
          <Download class="h-5 w-5 text-primary" />
          <UiCardTitle>App Installation</UiCardTitle>
        </div>
        <UiCardDescription>
          Install OpenDynamics on your device for quick access.
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <PWAInstallPrompt />
      </UiCardContent>
    </UiCard>

    <!-- Notification Prompt Component Examples -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Component Examples</h2>
      
      <div class="grid gap-4 md:grid-cols-2">
        <NotificationPrompt variant="card" />
        <NotificationPrompt variant="inline" />
      </div>
      
      <NotificationPrompt variant="banner" />
    </div>
  </div>
</template>
