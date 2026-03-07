<script setup lang="ts">
import type { Component } from 'vue'
import { LayoutDashboard, FolderOpen, Search } from 'lucide-vue-next'

type LinkItem = {
  label: string
  href: string
  icon: Component
  type: 'link'
}

type ActionItem = {
  label: string
  icon: Component
  type: 'action'
}

type NavItem = LinkItem | ActionItem

const { isAdmin } = useAuth()
const route = useRoute()
const { openPalette } = useCommandPalette()

const navItems = computed<NavItem[]>(() => [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, type: 'link' },
  { label: 'Cases', href: isAdmin() ? '/admin/cases' : '/cases', icon: FolderOpen, type: 'link' },
  { label: 'Search', icon: Search, type: 'action' },
])

function isActive(item: NavItem) {
  if (item.type !== 'link') return false
  if (item.href === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(item.href)
}

function handleSearch() {
  openPalette()
}
</script>

<template>
  <nav
    class="pointer-events-none fixed bottom-4 left-0 right-0 z-40 px-4 md:hidden"
    aria-label="Bottom navigation"
  >
    <div
      class="pointer-events-auto mx-auto flex h-[72px] max-w-xl items-center justify-between rounded-2xl border bg-background/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <template v-for="item in navItems" :key="item.label">
        <NuxtLink
          v-if="item.type === 'link'"
          :to="item.href"
          class="flex h-full flex-1 items-center justify-center"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <div
            :class="[
              'mx-1 flex h-[56px] w-full max-w-[140px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors',
              isActive(item)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            ]"
          >
            <component :is="item.icon" class="h-5 w-5" />
            {{ item.label }}
          </div>
        </NuxtLink>

        <button
          v-else
          type="button"
          class="mx-1 flex h-[56px] max-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          @click="handleSearch"
        >
          <Search class="h-5 w-5" />
          {{ item.label }}
        </button>
      </template>
    </div>
  </nav>
</template>
