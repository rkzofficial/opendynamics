<script setup lang="ts">
const { fetchSession, isLoading, isAuthenticated } = useAuth()
const { initTheme } = useTheme()
const router = useRouter()

onMounted(async () => {
  initTheme()
  await fetchSession()

  if (isAuthenticated.value) {
    router.push('/')
  }
})

watch(isAuthenticated, (value) => {
  if (value && !isLoading.value) {
    router.push('/')
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex h-screen items-center justify-center">
    <UiSpinner size="lg" />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
    <slot />

    <!-- PWA Install Prompt for login page -->
    <div class="fixed bottom-4 right-4 z-50 max-w-sm">
      <PWAInstallPrompt />
    </div>
  </div>
</template>
