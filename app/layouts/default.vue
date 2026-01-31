<script setup lang="ts">
const sidebarOpen = ref(false)

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

  <div v-else-if="isAuthenticated" class="flex min-h-screen">
    <LayoutSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="flex flex-1 flex-col">
      <LayoutHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
