<script setup lang="ts">
import { ArrowLeft, FileText, Copy, Check, Users, AlertTriangle, User, Share2 } from 'lucide-vue-next'
import type { CaseDetail, AttachmentItem, ActivityItem, NoteItem } from '~/types'
import type { TimelineItem } from '~/components/cases/ActivityTimeline.vue'
import {
  getStatusReasonLabel,
  getStatusReasonBadgeClass,
  getPriorityLabel,
  getPriorityBadgeClass,
} from '~/utils/caseHelpers'

interface CompareItem {
  attachment: AttachmentItem
  previewUrl: string | null
  isLoading: boolean
}

interface SLAData {
  deadline?: string
  status?: number
  succeeded?: string
}

interface Props {
  case: CaseDetail | null
  isLoading: boolean
  isDownloadingAttachment?: boolean
  isPreviewOpen?: boolean
  previewIndex?: number
  previewUrl?: string | null
  isLoadingPreview?: boolean
  isCompareOpen?: boolean
  compareItems?: CompareItem[]
  firstResponseSLA?: SLAData | null
  customerUpdateSLA?: SLAData | null
  firstResponseCountdown?: string
  customerUpdateCountdown?: string
  adminUserInfo?: { name: string }
  error?: string
  showShareButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  firstResponseCountdown: '',
  customerUpdateCountdown: '',
  error: '',
  isDownloadingAttachment: false,
  isPreviewOpen: false,
  previewIndex: 0,
  previewUrl: null,
  isLoadingPreview: false,
  isCompareOpen: false,
  compareItems: () => [],
  showShareButton: false,
})

const emit = defineEmits<{
  back: []
  downloadAttachment: [attachment: AttachmentItem]
  previewAttachment: [index: number]
  navigatePreview: [index: number]
  closePreview: []
  compareAttachments: [indices: number[]]
  closeCompare: []
  removeFromCompare: [index: number]
  share: []
}>()

const descriptionCopied = ref(false)

async function copyDescription() {
  if (!props.case?.description) return
  await navigator.clipboard.writeText(props.case.description)
  descriptionCopied.value = true
  setTimeout(() => {
    descriptionCopied.value = false
  }, 2000)
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function linkifyText(text: string): string {
  // First escape HTML to prevent XSS
  let escaped = escapeHtml(text)
  // Convert newlines to <br> tags for proper line breaks
  escaped = escaped.replace(/\n/g, '<br>')
  // Match URLs (http, https, ftp) and www. prefixed URLs
  const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi
  return escaped.replace(urlPattern, (url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 break-all">${url}</a>`
  })
}

const linkedDescription = computed(() => {
  if (!props.case?.description) return ''
  return linkifyText(props.case.description)
})

const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  if (props.case?.activities) {
    for (const activity of props.case.activities) {
      items.push({
        id: activity.id,
        type: 'activity',
        data: activity,
        date: activity.createdAt,
      })
    }
  }

  if (props.case?.notes) {
    for (const note of props.case.notes) {
      items.push({
        id: note.id,
        type: 'note',
        data: note,
        date: note.createdAt,
      })
    }
  }

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back button and actions -->
    <div class="flex items-center justify-between">
      <UiButton variant="ghost" @click="emit('back')">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Cases
      </UiButton>

      <UiButton v-if="showShareButton && props.case" variant="outline" size="sm" @click="emit('share')">
        <Share2 class="mr-2 h-4 w-4" />
        Share
      </UiButton>
    </div>

    <!-- Admin user info card -->
    <UiCard v-if="adminUserInfo" class="bg-muted/50">
      <UiCardContent class="py-4">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary/10 p-2">
            <Users class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Viewing case for user</p>
            <p class="font-medium">{{ adminUserInfo.name }}</p>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <UiSkeleton class="h-8 w-64" />
      <UiSkeleton class="h-48 w-full" />
    </div>

    <!-- Error state -->
    <UiAlert v-else-if="error" variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <template v-else-if="props.case">
      <!-- Case header -->
      <div class="border-b pb-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-sm text-muted-foreground">
                {{ props.case.ticketNumber }}
              </span>
              <span class="text-muted-foreground/40">•</span>
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                  getStatusReasonBadgeClass(props.case.state)
                ]"
              >
                {{ getStatusReasonLabel(props.case.statusLabel) }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  getPriorityBadgeClass(props.case.priority)
                ]"
              >
                {{ getPriorityLabel(props.case.priority) }}
              </span>
            </div>
            <h1 class="text-xl font-bold tracking-tight lg:text-2xl">{{ props.case.title }}</h1>
          </div>

          <!-- Support Engineer -->
          <div v-if="props.case.owner?.name" class="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User class="h-4 w-4 text-primary" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Support Engineer</p>
              <p class="text-sm font-medium">{{ props.case.owner.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6 min-w-0">
          <!-- Description -->
          <UiCard>
            <UiCardHeader class="pb-3">
              <div class="flex items-center justify-between">
                <UiCardTitle class="flex items-center gap-2">
                  <FileText class="h-4 w-4 text-muted-foreground" />
                  Description
                </UiCardTitle>
                <UiButton
                  v-if="props.case.description"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="copyDescription"
                >
                  <Check v-if="descriptionCopied" class="h-4 w-4 text-green-500" />
                  <Copy v-else class="h-4 w-4" />
                </UiButton>
              </div>
            </UiCardHeader>
            <UiCardContent>
              <div
                v-if="props.case.description"
                class="rounded-md bg-muted/50 p-4 text-base leading-relaxed whitespace-pre-wrap break-words overflow-hidden"
                v-html="linkedDescription"
              />
              <div v-else class="flex items-center justify-center py-8 text-muted-foreground">
                <span class="italic">No description provided</span>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Attachments -->
          <CasesCaseAttachments
            :attachments="props.case?.attachments || []"
            :is-downloading="isDownloadingAttachment"
            @download="emit('downloadAttachment', $event)"
            @preview="emit('previewAttachment', $event)"
            @compare="emit('compareAttachments', $event)"
          />

          <!-- Attachment Preview Modal -->
          <CasesAttachmentPreviewModal
            :is-open="isPreviewOpen"
            :attachments="props.case?.attachments || []"
            :current-index="previewIndex"
            :preview-url="previewUrl"
            :is-loading="isLoadingPreview"
            @close="emit('closePreview')"
            @navigate="emit('navigatePreview', $event)"
            @download="emit('downloadAttachment', $event)"
          />

          <!-- Attachment Compare Modal -->
          <CasesAttachmentCompareModal
            :is-open="isCompareOpen"
            :items="compareItems"
            @close="emit('closeCompare')"
            @download="emit('downloadAttachment', $event)"
            @remove="emit('removeFromCompare', $event)"
          />

          <!-- Activity timeline -->
          <CasesActivityTimeline
            :items="timelineItems"
            variant="detailed"
          />
        </div>

        <!-- Sidebar -->
        <CasesCaseDetailSidebar
          :case="props.case"
          :first-response-s-l-a="firstResponseSLA"
          :customer-update-s-l-a="customerUpdateSLA"
          :first-response-countdown="firstResponseCountdown"
          :customer-update-countdown="customerUpdateCountdown"
        />
      </div>
    </template>

    <!-- Not found -->
    <UiCard v-else>
      <UiCardContent class="py-12 text-center">
        <AlertTriangle class="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p class="text-muted-foreground">Case not found</p>
        <UiButton variant="outline" class="mt-4" @click="emit('back')">
          {{ adminUserInfo ? 'Go Back' : 'Go to Cases' }}
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
