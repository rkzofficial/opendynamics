<script setup lang="ts">
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, FileQuestion } from 'lucide-vue-next'
import type { AttachmentItem } from '~/types'

interface Props {
  isOpen: boolean
  attachments: AttachmentItem[]
  currentIndex: number
  previewUrl: string | null
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  navigate: [index: number]
  download: [attachment: AttachmentItem]
}>()

// Zoom state
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const imageRef = ref<HTMLElement | null>(null)

// Touch swipe state
let touchStartX = 0
let touchStartY = 0

const currentAttachment = computed(() => {
  return props.attachments[props.currentIndex] || null
})

const isImage = computed(() => {
  return currentAttachment.value?.mimeType?.startsWith('image/')
})

const isVideo = computed(() => {
  return currentAttachment.value?.mimeType?.startsWith('video/')
})

const canPreview = computed(() => {
  return isImage.value || isVideo.value
})

const hasPrevious = computed(() => props.currentIndex > 0)
const hasNext = computed(() => props.currentIndex < props.attachments.length - 1)

const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
}))

function zoomIn() {
  scale.value = Math.min(scale.value * 1.25, 4)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.25, 0.5)
}

function resetZoom() {
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

function handleWheel(e: WheelEvent) {
  if (!isImage.value) return
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function handleMouseDown(e: MouseEvent) {
  if (scale.value <= 1 || !isImage.value) return
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  position.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y,
  }
}

function handleMouseUp() {
  isDragging.value = false
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.changedTouches.length !== 1) return

  const diffX = touchStartX - e.changedTouches[0].clientX
  const diffY = Math.abs(touchStartY - e.changedTouches[0].clientY)

  // Only navigate if horizontal swipe is significant and vertical is small
  if (Math.abs(diffX) > 50 && diffY < 100) {
    if (diffX > 0 && hasNext.value) {
      goToNext()
    } else if (diffX < 0 && hasPrevious.value) {
      goToPrevious()
    }
  }
}

function goToPrevious() {
  if (hasPrevious.value) {
    resetZoom()
    emit('navigate', props.currentIndex - 1)
  }
}

function goToNext() {
  if (hasNext.value) {
    resetZoom()
    emit('navigate', props.currentIndex + 1)
  }
}

function handleClose() {
  resetZoom()
  emit('close')
}

function handleDownload() {
  if (currentAttachment.value) {
    emit('download', currentAttachment.value)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return

  switch (e.key) {
    case 'Escape':
      handleClose()
      break
    case 'ArrowLeft':
      goToPrevious()
      break
    case 'ArrowRight':
      goToNext()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

// Keyboard event listener
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Reset zoom when attachment changes
watch(() => props.currentIndex, () => {
  resetZoom()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex flex-col bg-black/95"
        @click="handleBackdropClick"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-black/50 text-white">
          <button
            class="p-2 rounded-lg hover:bg-white/10 transition-colors"
            @click="handleClose"
          >
            <X class="h-5 w-5" />
          </button>

          <div class="flex-1 text-center px-4 truncate">
            <span class="font-medium">{{ currentAttachment?.filename }}</span>
          </div>

          <div class="text-sm text-white/70">
            {{ currentIndex + 1 }} / {{ attachments.length }}
          </div>
        </div>

        <!-- Main content area -->
        <div
          class="flex-1 relative flex items-center justify-center overflow-hidden"
          @wheel="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <!-- Loading state -->
          <div v-if="isLoading" class="flex flex-col items-center gap-4 text-white">
            <Loader2 class="h-12 w-12 animate-spin" />
            <span>Loading preview...</span>
          </div>

          <!-- Image preview -->
          <template v-else-if="previewUrl && isImage">
            <img
              ref="imageRef"
              :src="previewUrl"
              :alt="currentAttachment?.filename"
              class="max-h-full max-w-full object-contain select-none transition-transform duration-100"
              :style="imageStyle"
              draggable="false"
            />
          </template>

          <!-- Video preview -->
          <template v-else-if="previewUrl && isVideo">
            <video
              :src="previewUrl"
              controls
              autoplay
              class="max-h-full max-w-full"
            >
              Your browser does not support video playback.
            </video>
          </template>

          <!-- Unsupported preview -->
          <div v-else-if="!canPreview && !isLoading" class="flex flex-col items-center gap-4 text-white/70">
            <FileQuestion class="h-16 w-16" />
            <span class="text-lg">Preview not available for this file type</span>
            <span class="text-sm">{{ currentAttachment?.mimeType }}</span>
            <UiButton variant="outline" class="mt-4" @click="handleDownload">
              <Download class="h-4 w-4 mr-2" />
              Download File
            </UiButton>
          </div>

          <!-- Previous button -->
          <button
            v-if="hasPrevious"
            class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            @click.stop="goToPrevious"
          >
            <ChevronLeft class="h-6 w-6" />
          </button>

          <!-- Next button -->
          <button
            v-if="hasNext"
            class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            @click.stop="goToNext"
          >
            <ChevronRight class="h-6 w-6" />
          </button>
        </div>

        <!-- Footer toolbar -->
        <div class="flex items-center justify-center gap-2 px-4 py-3 bg-black/50">
          <!-- Zoom controls (only for images) -->
          <template v-if="isImage && previewUrl">
            <button
              class="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              @click="zoomOut"
              title="Zoom out (-)"
            >
              <ZoomOut class="h-5 w-5" />
            </button>
            <button
              class="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              @click="resetZoom"
              title="Reset zoom (0)"
            >
              <RotateCcw class="h-5 w-5" />
            </button>
            <button
              class="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              @click="zoomIn"
              title="Zoom in (+)"
            >
              <ZoomIn class="h-5 w-5" />
            </button>
            <div class="w-px h-6 bg-white/20 mx-2" />
          </template>

          <!-- Download button -->
          <button
            class="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            @click="handleDownload"
            title="Download"
          >
            <Download class="h-5 w-5" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
