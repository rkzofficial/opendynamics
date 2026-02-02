<script setup lang="ts">
import { Paperclip, Download, FileText, FileImage, FileArchive, File, Loader2 } from 'lucide-vue-next'
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
}>()

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
      <UiCardTitle class="flex items-center gap-2">
        <Paperclip class="h-4 w-4 text-muted-foreground" />
        Attachments
        <span v-if="attachments.length > 0" class="text-sm font-normal text-muted-foreground">
          ({{ attachments.length }})
        </span>
      </UiCardTitle>
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
            'flex items-center gap-4 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors',
            canPreview(attachment.mimetype) ? 'cursor-pointer' : ''
          ]"
          @click="handleRowClick(index, attachment.mimetype)"
        >
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
