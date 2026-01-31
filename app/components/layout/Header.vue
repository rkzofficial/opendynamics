<script setup lang="ts">
import { Menu, Bell, Settings } from 'lucide-vue-next'

const emit = defineEmits<{
  toggleSidebar: []
}>()

const { user, isAdmin } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
    <UiButton
      variant="ghost"
      size="icon"
      class="md:hidden"
      @click="emit('toggleSidebar')"
    >
      <Menu class="h-5 w-5" />
      <span class="sr-only">Toggle Menu</span>
    </UiButton>

    <div class="flex-1" />

    <div class="flex items-center gap-4">
      <LayoutThemeToggle />

      <UiButton
        variant="ghost"
        size="icon"
      >
        <Bell class="h-5 w-5" />
        <span class="sr-only">Notifications</span>
      </UiButton>

      <UiButton
        v-if="isAdmin()"
        variant="ghost"
        size="icon"
        as-child
      >
        <NuxtLink to="/settings">
          <Settings class="h-5 w-5" />
          <span class="sr-only">Settings</span>
        </NuxtLink>
      </UiButton>

      <LayoutUserMenu />
    </div>
  </header>
</template>
