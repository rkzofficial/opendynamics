<script setup lang="ts">
import { LogOut, User } from 'lucide-vue-next'

const { user, logout, isAdmin } = useAuth()
const router = useRouter()
const { trigger } = useHaptics()

async function handleLogout() {
  await logout()
}

function goToProfile() {
  trigger('navigation')
  router.push('/settings')
}
</script>

<template>
  <UiDropdownMenu>
    <template #trigger>
      <UiButton variant="ghost" size="icon" class="rounded-full">
        <UiAvatar
          :fallback="user?.name?.charAt(0) || user?.username?.charAt(0) || '?'"
          class="h-8 w-8"
        />
      </UiButton>
    </template>

    <template #default="{ close }">
      <div class="px-2 py-1.5">
        <p class="text-sm font-medium">{{ user?.name || user?.username }}</p>
        <p class="text-xs text-muted-foreground">{{ user?.email || user?.username }}</p>
      </div>
      <UiSeparator class="my-1" />
      <UiDropdownMenuItem haptic-intent="none" @click="goToProfile(); close()">
        <User class="mr-2 h-4 w-4" />
        Profile
      </UiDropdownMenuItem>
      <UiSeparator class="my-1" />
      <UiDropdownMenuItem destructive haptic-intent="none" @click="handleLogout(); close()">
        <LogOut class="mr-2 h-4 w-4" />
        Logout
      </UiDropdownMenuItem>
    </template>
  </UiDropdownMenu>
</template>
