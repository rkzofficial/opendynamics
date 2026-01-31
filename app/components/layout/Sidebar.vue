<script setup lang="ts">
import { LayoutDashboard, FolderOpen, X, Users, Eye } from 'lucide-vue-next'

interface Props {
  isOpen: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { isAdmin } = useAuth()

const route = useRoute()

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  ]

  // Only show Cases for non-admin users
  if (!isAdmin()) {
    items.push({ name: 'Cases', href: '/cases', icon: FolderOpen })
  }

  // Add admin-only navigation items
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
  <!-- Mobile overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-40 bg-black/80 md:hidden"
    @click="emit('close')"
  />

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center justify-between border-b px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          OD
        </div>
        <span>OpenDynamics</span>
      </NuxtLink>
      <UiButton
        variant="ghost"
        size="icon"
        class="md:hidden"
        @click="emit('close')"
      >
        <X class="h-5 w-5" />
      </UiButton>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 p-4">
      <NuxtLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.href"
        :class="[
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        ]"
        @click="emit('close')"
      >
        <component :is="item.icon" class="h-5 w-5" />
        {{ item.name }}
      </NuxtLink>
    </nav>

  </aside>
</template>
