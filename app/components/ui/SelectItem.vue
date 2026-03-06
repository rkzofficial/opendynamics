<script setup lang="ts">
import {
  SelectItem,
  SelectItemIndicator,
  type SelectItemProps,
  SelectItemText,
} from 'radix-vue'
import { Check } from 'lucide-vue-next'
import { cn } from '~/utils/cn'
import type { HapticIntent } from '~/types'

const props = withDefaults(defineProps<SelectItemProps & { class?: string; hapticIntent?: HapticIntent | 'none' }>(), {
  hapticIntent: 'none',
})

const { trigger } = useHaptics()

const forwardedProps = computed(() => {
  const { class: _class, hapticIntent: _hapticIntent, ...rest } = props
  return rest
})

function handleClick() {
  if (props.disabled || props.hapticIntent === 'none') return
  trigger(props.hapticIntent)
}
</script>

<template>
  <SelectItem
    v-bind="forwardedProps"
    :class="cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class
    )"
    @click="handleClick"
  >
    <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="h-4 w-4" />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
