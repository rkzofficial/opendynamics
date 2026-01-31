<script setup lang="ts">
import { Menu, Bell, Settings } from 'lucide-vue-next'

const emit = defineEmits<{
  toggleSidebar: []
}>()

const { user, isAdmin } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
    <button
      class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 md:hidden"
      @click="emit('toggleSidebar')"
    >
      <Menu class="h-5 w-5" />
      <span class="sr-only">Toggle Menu</span>
    </button>

    <div class="flex-1" />

    <div class="flex items-center gap-4">
      <button
        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
      >
        <Bell class="h-5 w-5" />
        <span class="sr-only">Notifications</span>
      </button>

      <NuxtLink
        v-if="isAdmin()"
        to="/settings"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
      >
        <Settings class="h-5 w-5" />
        <span class="sr-only">Settings</span>
      </NuxtLink>

      <LayoutUserMenu />
    </div>
  </header>
</template>
