<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '~/utils/cn'
import { onClickOutside } from '@vueuse/core'

interface Props {
  align?: 'start' | 'center' | 'end'
}

const props = withDefaults(defineProps<Props>(), {
  align: 'end',
})

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const { trigger } = useHaptics()
let hasObservedMenuState = false

onClickOutside(menuRef, () => {
  isOpen.value = false
})

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

const alignmentClasses = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
}

watch(isOpen, (open) => {
  if (!hasObservedMenuState) {
    hasObservedMenuState = true
    return
  }

  trigger(open ? 'modalOpen' : 'modalClose')
}, { immediate: true })
</script>

<template>
  <div ref="menuRef" class="relative inline-block text-left">
    <div @click="toggle">
      <slot name="trigger" />
    </div>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        :class="cn(
          'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          alignmentClasses[align],
          $attrs.class as string
        )"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
