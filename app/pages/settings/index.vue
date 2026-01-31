<script setup lang="ts">
import { Users, Shield, Link2 } from 'lucide-vue-next'

const { user, isAdmin } = useAuth()
const router = useRouter()

// Redirect non-admins
onMounted(() => {
  if (!isAdmin()) {
    router.push('/')
  }
})

const settingsLinks = [
  {
    title: 'User Management',
    description: 'Create and manage user accounts',
    href: '/settings/users',
    icon: Users,
  },
  {
    title: 'OIDC Configuration',
    description: 'Configure Single Sign-On with OIDC',
    href: '/settings/oidc',
    icon: Shield,
  },
  {
    title: 'Dynamics Connection',
    description: 'Connect to Microsoft Dynamics 365 CRM',
    href: '/settings/dynamics',
    icon: Link2,
  },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
      <p class="text-muted-foreground">
        Manage your application settings and configurations
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="link in settingsLinks"
        :key="link.href"
        :to="link.href"
      >
        <UiCard class="h-full transition-colors hover:bg-muted/50">
          <UiCardHeader>
            <div class="flex items-center gap-4">
              <div class="rounded-lg bg-primary/10 p-2">
                <component :is="link.icon" class="h-6 w-6 text-primary" />
              </div>
              <div>
                <UiCardTitle class="text-lg">{{ link.title }}</UiCardTitle>
                <UiCardDescription>{{ link.description }}</UiCardDescription>
              </div>
            </div>
          </UiCardHeader>
        </UiCard>
      </NuxtLink>
    </div>
  </div>
</template>
