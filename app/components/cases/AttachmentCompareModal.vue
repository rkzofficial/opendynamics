<script setup lang="ts">
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, FileQuestion, XCircle } from 'lucide-vue-next'
import type { AttachmentItem } from '~/types'

interface CompareItem {
  attachment: AttachmentItem
  previewUrl: string | null
  isLoading: boolean
}

interface Props {
  isOpen: boolean
  items: CompareItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  download: [attachment: AttachmentItem]
  remove: [index: number]
}>()
const { trigger } = useHaptics()
let hasObservedOpenState = false

// Independent zoom/pan state for each item
const itemStates = ref<Array<{
  scale: number
  position: { x: number; y: number }
  isDragging: boolean
  dragStart: { x: number; y: number }
}>>([])

// Initialize states when items change
watch(() => props.items.length, (len) => {
  while (itemStates.value.length < len) {
    itemStates.value.push({
      scale: 1,
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
    })
  }
  if (itemStates.value.length > len) {
    itemStates.value = itemStates.value.slice(0, len)
  }
}, { immediate: true })

// Dynamic grid class based on item count
const gridClass = computed(() => {
  const count = props.items.length
  if (count <= 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2 grid-rows-2'
  if (count <= 6) return 'grid-cols-3 grid-rows-2'
  return 'grid-cols-4 grid-rows-2'
})

function isImage(mimetype: string): boolean {
  return mimetype?.startsWith('image/') || false
}

function isVideo(mimetype: string): boolean {
  return mimetype?.startsWith('video/') || false
}

function canPreview(mimetype: string): boolean {
  return isImage(mimetype) || isVideo(mimetype)
}

function getItemStyle(index: number) {
  const state = itemStates.value[index]
  if (!state) return {}
  return {
    transform: `translate(${state.position.x}px, ${state.position.y}px) scale(${state.scale})`,
    cursor: state.scale > 1 ? (state.isDragging ? 'grabbing' : 'grab') : 'default',
  }
}

function zoomIn(index: number) {
  const state = itemStates.value[index]
  if (state) {
    state.scale = Math.min(state.scale * 1.25, 4)
  }
}

function zoomOut(index: number) {
  const state = itemStates.value[index]
  if (state) {
    state.scale = Math.max(state.scale / 1.25, 0.5)
  }
}

function resetZoom(index: number) {
  const state = itemStates.value[index]
  if (state) {
    state.scale = 1
    state.position = { x: 0, y: 0 }
  }
}

function handleWheel(e: WheelEvent, index: number) {
  const item = props.items[index]
  if (!item || !isImage(item.attachment.mimeType)) return
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn(index)
  } else {
    zoomOut(index)
  }
}

function handleMouseDown(e: MouseEvent, index: number) {
  const state = itemStates.value[index]
  const item = props.items[index]
  if (!state || !item || state.scale <= 1 || !isImage(item.attachment.mimeType)) return
  state.isDragging = true
  state.dragStart = {
    x: e.clientX - state.position.x,
    y: e.clientY - state.position.y,
  }
}

function handleMouseMove(e: MouseEvent, index: number) {
  const state = itemStates.value[index]
  if (!state || !state.isDragging) return
  state.position = {
    x: e.clientX - state.dragStart.x,
    y: e.clientY - state.dragStart.y,
  }
}

function handleMouseUp(index: number) {
  const state = itemStates.value[index]
  if (state) {
    state.isDragging = false
  }
}

function handleClose() {
  // Reset all zoom states
  itemStates.value.forEach((state) => {
    state.scale = 1
    state.position = { x: 0, y: 0 }
  })
  emit('close')
}

function handleDownload(attachment: AttachmentItem) {
  emit('download', attachment)
}

function handleRemove(index: number) {
  emit('remove', index)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    handleClose()
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => props.isOpen, (open) => {
  if (!hasObservedOpenState) {
    hasObservedOpenState = true
    return
  }

  trigger(open ? 'modalOpen' : 'modalClose')
}, { immediate: true })
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
        v-if="isOpen && items.length > 0"
        class="fixed inset-0 z-50 flex flex-col bg-black/95"
        @click="handleBackdropClick"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-black/50 text-white">
          <button
            class="p-2 rounded-lg hover:bg-white/10 transition-colors"
            @click="handleClose"
          >
            <X class="h-5 w-5" />
          </button>

          <div class="flex-1 text-center">
            <span class="font-medium">Comparing {{ items.length }} attachments</span>
          </div>

          <div class="w-9" />
        </div>

        <!-- Grid content -->
        <div
          class="flex-1 grid gap-1 p-1 overflow-hidden"
          :class="gridClass"
        >
          <div
            v-for="(item, index) in items"
            :key="item.attachment.id"
            class="relative flex flex-col bg-black/30 rounded-lg overflow-hidden"
          >
            <!-- Item header -->
            <div class="flex items-center justify-between px-3 py-2 bg-black/50 text-white text-sm">
              <span class="truncate flex-1 mr-2" :title="item.attachment.filename">
                {{ item.attachment.filename }}
              </span>
              <button
                class="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                title="Remove from comparison"
                @click="handleRemove(index)"
              >
                <XCircle class="h-4 w-4" />
              </button>
            </div>

            <!-- Content area -->
            <div
              class="flex-1 relative flex items-center justify-center overflow-hidden"
              @wheel="handleWheel($event, index)"
              @mousedown="handleMouseDown($event, index)"
              @mousemove="handleMouseMove($event, index)"
              @mouseup="handleMouseUp(index)"
              @mouseleave="handleMouseUp(index)"
            >
              <!-- Loading state -->
              <div v-if="item.isLoading" class="flex flex-col items-center gap-2 text-white">
                <Loader2 class="h-8 w-8 animate-spin" />
                <span class="text-sm">Loading...</span>
              </div>

              <!-- Image preview -->
              <template v-else-if="item.previewUrl && isImage(item.attachment.mimeType)">
                <img
                  :src="item.previewUrl"
                  :alt="item.attachment.filename"
                  class="max-h-full max-w-full object-contain select-none transition-transform duration-100"
                  :style="getItemStyle(index)"
                  draggable="false"
                />
              </template>

              <!-- Video preview -->
              <template v-else-if="item.previewUrl && isVideo(item.attachment.mimeType)">
                <video
                  :src="item.previewUrl"
                  controls
                  class="max-h-full max-w-full"
                >
                  Your browser does not support video playback.
                </video>
              </template>

              <!-- Unsupported preview -->
              <div v-else-if="!canPreview(item.attachment.mimeType) && !item.isLoading" class="flex flex-col items-center gap-2 text-white/70">
                <FileQuestion class="h-10 w-10" />
                <span class="text-sm">Preview not available</span>
              </div>
            </div>

            <!-- Item footer controls -->
            <div class="flex items-center justify-center gap-1 px-2 py-2 bg-black/50">
              <!-- Zoom controls (only for images) -->
              <template v-if="isImage(item.attachment.mimeType) && item.previewUrl">
                <button
                  class="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
                  @click="zoomOut(index)"
                  title="Zoom out"
                >
                  <ZoomOut class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
                  @click="resetZoom(index)"
                  title="Reset zoom"
                >
                  <RotateCcw class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
                  @click="zoomIn(index)"
                  title="Zoom in"
                >
                  <ZoomIn class="h-4 w-4" />
                </button>
                <div class="w-px h-4 bg-white/20 mx-1" />
              </template>

              <!-- Download button -->
              <button
                class="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
                @click="handleDownload(item.attachment)"
                title="Download"
              >
                <Download class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
