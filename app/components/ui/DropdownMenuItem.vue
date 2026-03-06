<script setup lang="ts">
import { cn } from '~/utils/cn'
import type { HapticIntent } from '~/types'

interface Props {
  disabled?: boolean
  destructive?: boolean
  hapticIntent?: HapticIntent | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  destructive: false,
  hapticIntent: 'none',
})

const emit = defineEmits<{
  click: []
}>()

const { trigger } = useHaptics()

function handleClick() {
  if (!props.disabled && props.hapticIntent !== 'none') {
    trigger(props.hapticIntent)
  }

  emit('click')
}
</script>

<template>
  <button
    :disabled="disabled"
    :class="cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
      $attrs.class as string
    )"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
