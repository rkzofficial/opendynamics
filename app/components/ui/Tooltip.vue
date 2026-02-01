<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  content?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  position: 'top',
  delay: 300,
  maxWidth: '300px'
})

const isVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

function calculatePosition() {
  if (!triggerRef.value || !tooltipRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const gap = 8

  let top = 0
  let left = 0

  switch (props.position) {
    case 'top':
      top = triggerRect.top + scrollY - tooltipRect.height - gap
      left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + scrollY + gap
      left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.left + scrollX - tooltipRect.width - gap
      break
    case 'right':
      top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.right + scrollX + gap
      break
  }

  // Keep tooltip within viewport
  const padding = 8
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (left < padding) left = padding
  if (left + tooltipRect.width > viewportWidth - padding) {
    left = viewportWidth - tooltipRect.width - padding
  }
  if (top < padding) top = triggerRect.bottom + scrollY + gap
  if (top + tooltipRect.height > viewportHeight + scrollY - padding) {
    top = triggerRect.top + scrollY - tooltipRect.height - gap
  }

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    maxWidth: props.maxWidth
  }
}

function show() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  showTimeout = setTimeout(() => {
    isVisible.value = true
    nextTick(() => {
      calculatePosition()
    })
  }, props.delay)
}

function hide() {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  hideTimeout = setTimeout(() => {
    isVisible.value = false
  }, 100)
}

onUnmounted(() => {
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <span
    ref="triggerRef"
    class="block w-full"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot />
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isVisible && content"
          ref="tooltipRef"
          class="fixed z-50 rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md border"
          :style="tooltipStyle"
          @mouseenter="show"
          @mouseleave="hide"
        >
          <div class="whitespace-pre-wrap break-words">{{ content }}</div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>
