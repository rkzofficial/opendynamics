<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'

const { isDark, toggleTheme } = useTheme()
const { trigger } = useHaptics()

function handleToggleTheme() {
  toggleTheme()
  trigger('selection')
}
</script>

<template>
  <UiButton
    variant="ghost"
    size="icon"
    haptic-intent="none"
    @click="handleToggleTheme"
  >
    <Sun v-if="isDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
    <span class="sr-only">Toggle theme</span>
  </UiButton>
</template>
