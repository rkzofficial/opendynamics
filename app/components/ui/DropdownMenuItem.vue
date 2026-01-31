<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  disabled?: boolean
  destructive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  destructive: false,
})

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :disabled="disabled"
    :class="cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
      $attrs.class as string
    )"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>
