<script setup lang="ts">
import { Paperclip, Download, FileText, FileImage, FileArchive, File, Loader2, Columns2 } from 'lucide-vue-next'
import type { CaseAttachment } from '~/types'
import { formatCaseDate } from '~/utils/caseHelpers'

interface Props {
  attachments: CaseAttachment[]
  isLoading?: boolean
  isDownloading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isDownloading: false,
})

const emit = defineEmits<{
  download: [attachment: CaseAttachment]
  preview: [index: number]
  compare: [indices: number[]]
}>()

// Selection state for comparison
const selectedIndices = ref<Set<number>>(new Set())

const selectedCount = computed(() => selectedIndices.value.size)
const canCompare = computed(() => selectedCount.value >= 2)

function isSelected(index: number): boolean {
  return selectedIndices.value.has(index)
}

function toggleSelection(index: number, e: Event) {
  e.stopPropagation()
  const newSet = new Set(selectedIndices.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    // Limit to 8 items max
    if (newSet.size >= 8) return
    newSet.add(index)
  }
  selectedIndices.value = newSet
}

function clearSelection() {
  selectedIndices.value = new Set()
}

function handleCompare() {
  if (!canCompare.value) return
  const indices = Array.from(selectedIndices.value).sort((a, b) => a - b)
  emit('compare', indices)
}

// Clear selection when attachments change
watch(() => props.attachments, () => {
  selectedIndices.value = new Set()
})

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return FileImage
  if (mimetype.includes('zip') || mimetype.includes('archive') || mimetype.includes('tar') || mimetype.includes('rar')) return FileArchive
  if (mimetype.includes('text') || mimetype.includes('pdf') || mimetype.includes('document')) return FileText
  return File
}

function canPreview(mimetype: string): boolean {
  return mimetype.startsWith('image/') || mimetype.startsWith('video/')
}

function handleRowClick(index: number, mimetype: string) {
  if (canPreview(mimetype)) {
    emit('preview', index)
  }
}

function handleDownloadClick(e: Event, attachment: CaseAttachment) {
  e.stopPropagation()
  emit('download', attachment)
}
</script>

<template>
  <UiCard v-if="isLoading || attachments.length > 0">
    <UiCardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <UiCardTitle class="flex items-center gap-2">
          <Paperclip class="h-4 w-4 text-muted-foreground" />
          Attachments
          <span v-if="attachments.length > 0" class="text-sm font-normal text-muted-foreground">
            ({{ attachments.length }})
          </span>
        </UiCardTitle>

        <!-- Compare button -->
        <div v-if="selectedCount > 0" class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{{ selectedCount }} selected</span>
          <UiButton
            v-if="canCompare"
            variant="outline"
            size="sm"
            @click="handleCompare"
          >
            <Columns2 class="h-4 w-4 mr-1.5" />
            Compare
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            @click="clearSelection"
          >
            Clear
          </UiButton>
        </div>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <div v-if="isLoading" class="space-y-3">
        <UiSkeleton v-for="i in 2" :key="i" class="h-16 w-full" />
      </div>

      <div v-else-if="attachments.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Paperclip class="h-10 w-10 mb-3 opacity-40" />
        <p class="text-sm">No attachments</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(attachment, index) in attachments"
          :key="attachment.annotationid"
          :class="[
            'flex items-center gap-3 p-3 rounded-lg border transition-colors',
            canPreview(attachment.mimetype) ? 'cursor-pointer' : '',
            isSelected(index) ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
          ]"
          @click="handleRowClick(index, attachment.mimetype)"
        >
          <!-- Checkbox for previewable attachments -->
          <div
            v-if="canPreview(attachment.mimetype)"
            class="flex-shrink-0"
            @click="toggleSelection(index, $event)"
          >
            <UiCheckbox
              :checked="isSelected(index)"
              class="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>

          <!-- File icon -->
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <component
              :is="getFileIcon(attachment.mimetype)"
              class="h-5 w-5 text-primary"
            />
          </div>

          <!-- File info -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate" :title="attachment.filename">
              {{ attachment.filename }}
            </p>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span v-if="attachment.filesize">{{ formatFileSize(attachment.filesize) }}</span>
              <span v-if="attachment.filesize && attachment.createdon" class="text-muted-foreground/40">|</span>
              <span :title="formatCaseDate(attachment.createdon).tooltip">
                {{ formatCaseDate(attachment.createdon).text }}
              </span>
              <template v-if="attachment.createdby?.fullname">
                <span class="text-muted-foreground/40">|</span>
                <span>{{ attachment.createdby.fullname }}</span>
              </template>
            </div>
          </div>

          <!-- Download button -->
          <UiButton
            variant="ghost"
            size="icon"
            class="h-9 w-9 flex-shrink-0"
            :disabled="isDownloading"
            @click="handleDownloadClick($event, attachment)"
          >
            <Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
