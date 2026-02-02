<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Wifi, WifiOff, RefreshCw } from 'lucide-vue-next'

const isOnline = ref(true)
const showOfflineBanner = ref(false)
const updateAvailable = ref(false)

onMounted(() => {
  isOnline.value = navigator.onLine
  showOfflineBanner.value = !navigator.onLine

  window.addEventListener('online', () => {
    isOnline.value = true
    showOfflineBanner.value = false
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    showOfflineBanner.value = true
  })

  // Listen for service worker updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      updateAvailable.value = true
    })
  }
})

const handleReload = () => {
  window.location.reload()
}

const dismissOfflineBanner = () => {
  showOfflineBanner.value = false
}
</script>

<template>
  <div>
    <!-- Offline Banner -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-full"
      enter-to-class="transform translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0"
      leave-to-class="transform -translate-y-full"
    >
      <div
        v-if="showOfflineBanner"
        class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white"
      >
        <WifiOff class="h-4 w-4" />
        <span class="text-sm font-medium">You are offline. Some features may be limited.</span>
        <UiButton
          variant="ghost"
          size="sm"
          class="h-auto px-2 py-1 text-white hover:text-white hover:bg-white/20"
          @click="dismissOfflineBanner"
        >
          Dismiss
        </UiButton>
      </div>
    </Transition>

    <!-- Update Available Toast -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-if="updateAvailable"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg"
      >
        <RefreshCw class="h-5 w-5" />
        <div>
          <p class="text-sm font-medium">Update Available</p>
          <p class="text-xs opacity-90">A new version is ready</p>
        </div>
        <UiButton
          size="sm"
          variant="secondary"
          @click="handleReload"
        >
          Reload
        </UiButton>
      </div>
    </Transition>

    <!-- Online Status Indicator (subtle) -->
    <div
      v-if="!isOnline"
      class="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-background border rounded-full shadow-lg"
    >
      <WifiOff class="h-4 w-4 text-amber-500" />
      <span class="text-xs font-medium">Offline</span>
    </div>
  </div>
</template>
