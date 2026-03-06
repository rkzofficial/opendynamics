<script setup lang="ts">
import { cn } from '~/utils/cn'
import { X } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  description?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
const { trigger } = useHaptics()
let hasObservedOpenState = false

function close() {
  emit('update:open', false)
}

watch(() => props.open, (open) => {
  if (!hasObservedOpenState) {
    hasObservedOpenState = true
    return
  }

  trigger(open ? 'modalOpen' : 'modalClose')
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/80"
          @click="close"
        />

        <!-- Content -->
        <div
          :class="cn(
            'relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
            $attrs.class as string
          )"
        >
          <!-- Close button -->
          <UiButton
            variant="ghost"
            size="icon"
            class="absolute right-4 top-4 h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
            haptic-intent="none"
            @click="close"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </UiButton>

          <!-- Header -->
          <div v-if="title || description" class="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 v-if="title" class="text-lg font-semibold leading-none tracking-tight">
              {{ title }}
            </h2>
            <p v-if="description" class="text-sm text-muted-foreground">
              {{ description }}
            </p>
          </div>

          <!-- Content slot -->
          <slot />

          <!-- Footer slot -->
          <div v-if="$slots.footer" class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
