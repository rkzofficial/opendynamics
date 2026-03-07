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
const { open: paletteOpen, openPalette } = useCommandPalette()

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

function isSelected(item: NavItem) {
  if (item.type === 'action') return paletteOpen.value
  return isActive(item)
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
      class="pointer-events-auto border-t border-border/60 bg-background/95 px-2 shadow-[0_-10px_30px_-24px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div class="grid h-20 grid-cols-3 gap-1">
        <template v-for="item in navItems" :key="item.label">
          <NuxtLink
            v-if="item.type === 'link'"
            :to="item.href"
            class="group flex min-w-0 items-center justify-center"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <span class="flex w-full max-w-[112px] flex-col items-center justify-center gap-1 px-1 py-2">
              <span
                :class="[
                  'flex h-8 min-w-[64px] items-center justify-center rounded-full px-5 transition-all duration-200',
                  isSelected(item)
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground group-hover:bg-muted/60 group-active:bg-muted'
                ]"
              >
                <component :is="item.icon" class="h-6 w-6" />
              </span>
              <span
                :class="[
                  'text-[11px] font-medium leading-none tracking-[0.015em] transition-colors duration-200',
                  isSelected(item) ? 'text-foreground' : 'text-muted-foreground'
                ]"
              >
                {{ item.label }}
              </span>
            </span>
          </NuxtLink>

          <button
            v-else
            type="button"
            class="group flex min-w-0 items-center justify-center"
            :aria-pressed="isSelected(item)"
            @click="handleSearch"
          >
            <span class="flex w-full max-w-[112px] flex-col items-center justify-center gap-1 px-1 py-2">
              <span
                :class="[
                  'flex h-8 min-w-[64px] items-center justify-center rounded-full px-5 transition-all duration-200',
                  isSelected(item)
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground group-hover:bg-muted/60 group-active:bg-muted'
                ]"
              >
                <component :is="item.icon" class="h-6 w-6" />
              </span>
              <span
                :class="[
                  'text-[11px] font-medium leading-none tracking-[0.015em] transition-colors duration-200',
                  isSelected(item) ? 'text-foreground' : 'text-muted-foreground'
                ]"
              >
                {{ item.label }}
              </span>
            </span>
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>
