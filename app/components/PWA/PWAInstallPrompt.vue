<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, X, Check } from 'lucide-vue-next'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

const isDismissed = ref(false)
const showInstallSuccess = ref(false)
const isStandalone = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

onMounted(() => {
  // Check if already running as installed PWA
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches

  // Check if early script captured the event
  if ((window as any).__pwaInstallPrompt) {
    deferredPrompt.value = (window as any).__pwaInstallPrompt
  }

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
    showInstallSuccess.value = true
    setTimeout(() => {
      showInstallSuccess.value = false
    }, 3000)
  })

  // Listen for beforeinstallprompt in case it fires later
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
  })
})

const handleInstall = async () => {
  if (!deferredPrompt.value) return

  await deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    deferredPrompt.value = null
  }
}

const handleDismiss = () => {
  isDismissed.value = true
}

const canShowPrompt = computed(() => {
  return !!deferredPrompt.value && !isStandalone.value && !isDismissed.value
})
</script>

<template>
  <!-- Install Prompt Card -->
  <UiCard v-if="canShowPrompt" class="relative border-primary/20 bg-background">
    <UiButton
      variant="ghost"
      size="icon"
      class="absolute top-2 right-2 h-6 w-6"
      @click="handleDismiss"
    >
      <X class="h-4 w-4" />
    </UiButton>
    <UiCardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <Download class="h-5 w-5 text-primary" />
        <UiCardTitle class="text-base">Install OpenDynamics</UiCardTitle>
      </div>
      <UiCardDescription>
        Install this app on your device for quick access and offline support.
      </UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <UiButton
        size="sm"
        class="w-full"
        @click="handleInstall"
      >
        <Download class="mr-2 h-4 w-4" />
        Install App
      </UiButton>
    </UiCardContent>
  </UiCard>

  <!-- Install Success Toast -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-2 opacity-0"
  >
    <div
      v-if="showInstallSuccess"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg"
    >
      <Check class="h-5 w-5" />
      <span class="text-sm font-medium">App installed successfully!</span>
    </div>
  </Transition>
</template>
