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
    class="pointer-events-none fixed bottom-0 left-0 right-0 z-40 md:hidden"
    aria-label="Bottom navigation"
  >
    <div
      class="pointer-events-auto flex h-20 items-center justify-around bg-background shadow-[0_-2px_8px_0_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/95"
    >
      <template v-for="item in navItems" :key="item.label">
        <NuxtLink
          v-if="item.type === 'link'"
          :to="item.href"
          class="flex h-full flex-1 items-center justify-center px-3"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <div
            :class="[
              'flex min-w-[64px] max-w-[120px] flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 text-xs font-medium transition-all duration-200',
              isActive(item)
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 active:bg-muted'
            ]"
          >
            <component :is="item.icon" class="h-6 w-6" />
            <span class="text-[11px]">{{ item.label }}</span>
          </div>
        </NuxtLink>

        <button
          v-else
          type="button"
          class="flex h-full flex-1 items-center justify-center px-3"
          @click="handleSearch"
        >
          <div
            class="flex min-w-[64px] max-w-[120px] flex-col items-center justify-center gap-1 rounded-2xl bg-secondary px-4 py-3 text-xs font-medium text-foreground transition-all duration-200 hover:bg-secondary/80 active:bg-secondary/90"
          >
            <Search class="h-6 w-6" />
            <span class="text-[11px]">{{ item.label }}</span>
          </div>
        </button>
      </template>
    </div>
  </nav>
</template>
