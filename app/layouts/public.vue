<script setup lang="ts">
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <!-- Simple header -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center px-4 md:px-6">
        <NuxtLink to="/" class="flex items-center space-x-2">
          <span class="font-bold text-lg">OpenDynamics</span>
        </NuxtLink>
        <div class="flex-1" />
        <span class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Shared View
        </span>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4 md:p-6">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t py-4">
      <div class="container flex items-center justify-center px-4 md:px-6">
        <p class="text-sm text-muted-foreground">
          <NuxtLink to="/login" class="text-primary hover:underline">
            Sign in
          </NuxtLink>
          for full access
        </p>
      </div>
    </footer>
  </div>
</template>
