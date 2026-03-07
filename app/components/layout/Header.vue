<script setup lang="ts">
import { Bell, Settings, Zap, LayoutDashboard, FolderOpen, Users, Eye, Search } from 'lucide-vue-next'

const { isAdmin } = useAuth()
const { openPalette } = useCommandPalette()
const route = useRoute()

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  ]

  if (!isAdmin()) {
    items.push({ name: 'Cases', href: '/cases', icon: FolderOpen })
  }

  if (isAdmin()) {
    items.push(
      { name: 'User Cases', href: '/admin/cases', icon: Eye },
      { name: 'Users', href: '/admin/users', icon: Users }
    )
  }

  return items
})

function isActive(href: string) {
  if (href === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(href)
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="flex h-14 items-center px-4 md:px-6">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 mr-6">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
          <Zap class="h-4 w-4" />
        </div>
        <span class="font-semibold text-sm tracking-tight hidden sm:block">OpenDynamics</span>
      </NuxtLink>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-1">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isActive(item.href)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          ]"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.name }}
        </NuxtLink>
      </nav>

      <div class="flex-1" />

      <!-- Right Side Actions -->
      <div class="flex items-center gap-1">
        <UiButton
          variant="ghost"
          size="icon"
          class="hidden md:inline-flex lg:hidden h-8 w-8"
          @click="openPalette"
        >
          <Search class="h-4 w-4" />
          <span class="sr-only">Search</span>
        </UiButton>

        <UiButton
          variant="outline"
          size="sm"
          class="hidden lg:inline-flex h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          @click="openPalette"
        >
          <Search class="h-3.5 w-3.5 mr-2" />
          Search
          <kbd class="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Ctrl + /
          </kbd>
        </UiButton>

        <LayoutThemeToggle />

        <UiButton variant="ghost" size="icon" class="h-8 w-8">
          <Bell class="h-4 w-4" />
          <span class="sr-only">Notifications</span>
        </UiButton>

        <UiButton variant="ghost" size="icon" class="h-8 w-8" haptic-intent="none" as-child>
          <NuxtLink to="/settings">
            <Settings class="h-4 w-4" />
            <span class="sr-only">Settings</span>
          </NuxtLink>
        </UiButton>

        <div class="hidden sm:block w-px h-6 bg-border mx-2" />

        <LayoutUserMenu />
      </div>
    </div>
  </header>
</template>
