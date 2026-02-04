<script setup lang="ts">
const { fetchSession, isLoading } = useAuth()
const { initTheme } = useTheme()

onMounted(async () => {
  initTheme()
  await fetchSession()
})
</script>

<template>
  <div v-if="isLoading" class="flex h-screen items-center justify-center">
    <UiSpinner size="lg" />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
    <slot />
  </div>
</template>
