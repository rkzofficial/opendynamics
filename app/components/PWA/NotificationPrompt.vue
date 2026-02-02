<script setup lang="ts">
import { computed } from 'vue'
import { Bell, BellOff, BellRing, X } from 'lucide-vue-next'
import { useNotifications } from '~/composables/useNotifications'

const props = defineProps<{
  variant?: 'card' | 'inline' | 'banner'
}>()

const emit = defineEmits<{
  (e: 'granted'): void
  (e: 'denied'): void
}>()

const { isSupported, permission, canNotify, requestPermission } = useNotifications()
const variant = computed(() => props.variant || 'card')

const handleRequestPermission = async () => {
  const granted = await requestPermission()
  if (granted) {
    emit('granted')
  } else {
    emit('denied')
  }
}

const statusConfig = computed(() => {
  switch (permission.value) {
    case 'granted':
      return {
        icon: BellRing,
        title: 'Notifications Enabled',
        description: 'You will receive updates and alerts.',
        variant: 'default' as const,
        showButton: false,
      }
    case 'denied':
      return {
        icon: BellOff,
        title: 'Notifications Blocked',
        description: 'Enable notifications in your browser settings.',
        variant: 'destructive' as const,
        showButton: false,
      }
    default:
      return {
        icon: Bell,
        title: 'Enable Notifications',
        description: 'Get notified about important updates and new cases.',
        variant: 'outline' as const,
        showButton: true,
      }
  }
})
</script>

<template>
  <div v-if="isSupported">
    <!-- Card Variant -->
    <UiCard v-if="variant === 'card'" class="border-dashed">
      <UiCardHeader class="pb-3">
        <div class="flex items-center gap-2">
          <component
            :is="statusConfig.icon"
            class="h-5 w-5"
            :class="permission === 'granted' ? 'text-green-500' : permission === 'denied' ? 'text-destructive' : 'text-muted-foreground'"
          />
          <UiCardTitle class="text-base">{{ statusConfig.title }}</UiCardTitle>
        </div>
        <UiCardDescription>{{ statusConfig.description }}</UiCardDescription>
      </UiCardHeader>
      <UiCardContent v-if="statusConfig.showButton">
        <UiButton
          size="sm"
          @click="handleRequestPermission"
          class="w-full"
        >
          <Bell class="mr-2 h-4 w-4" />
          Enable Notifications
        </UiButton>
      </UiCardContent>
    </UiCard>

    <!-- Inline Variant -->
    <div v-else-if="variant === 'inline'" class="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <component
        :is="statusConfig.icon"
        class="h-5 w-5 shrink-0"
        :class="permission === 'granted' ? 'text-green-500' : permission === 'denied' ? 'text-destructive' : 'text-muted-foreground'"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium">{{ statusConfig.title }}</p>
        <p class="text-xs text-muted-foreground">{{ statusConfig.description }}</p>
      </div>
      <UiButton
        v-if="statusConfig.showButton"
        size="sm"
        variant="outline"
        @click="handleRequestPermission"
      >
        Enable
      </UiButton>
    </div>

    <!-- Banner Variant -->
    <div v-else-if="variant === 'banner'" class="flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg shadow-lg">
      <Bell class="h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium">Stay Updated</p>
        <p class="text-xs opacity-90">Enable notifications for real-time case updates</p>
      </div>
      <UiButton
        v-if="statusConfig.showButton"
        size="sm"
        variant="secondary"
        @click="handleRequestPermission"
      >
        Enable
      </UiButton>
      <UiButton
        v-else-if="permission === 'granted'"
        size="sm"
        variant="secondary"
        disabled
      >
        <BellRing class="mr-2 h-4 w-4" />
        Enabled
      </UiButton>
    </div>
  </div>
</template>
