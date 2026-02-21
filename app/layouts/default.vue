<script setup lang="ts">
const { fetchSession, isLoading, isAuthenticated } = useAuth()
const { fetchConnectionStatus } = useDynamics()
const { initTheme } = useTheme()
const router = useRouter()

onMounted(async () => {
  initTheme()
  await fetchSession()

  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }

  fetchConnectionStatus()
})

watch(isAuthenticated, (value) => {
  if (!value && !isLoading.value) {
    router.push('/login')
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex h-screen items-center justify-center">
    <UiSpinner size="lg" />
  </div>

  <div v-else-if="isAuthenticated" class="min-h-screen flex flex-col">
    <LayoutHeader />
    <LayoutGlobalCommandPalette />

    <main class="flex-1 p-4 md:p-6">
      <slot />
    </main>

    <!-- PWA Status Components -->
    <PWAStatus />
  </div>
</template>
