<script setup lang="ts">
import { onUnmounted } from 'vue'
import { Copy, Check, Trash2, Eye, Clock, Link2 } from 'lucide-vue-next'
import { formatCountdown } from '~/utils/caseHelpers'
import { hasVisibleHtmlContent } from '~/utils/html'
import type { CaseShare } from '~/types'

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const {
  currentCase,
  isLoading,
  isDownloadingAttachment,
  isLoadingPreview,
  fetchCase,
  addInternalNote,
  addExternalNote,
  downloadAttachment,
  getAttachmentPreviewUrl,
  clearPreviewCache,
} = useCases()

const internalNoteSubject = ref('')
const internalNoteDescription = ref('')
const internalNoteError = ref('')
const isSubmittingInternalNote = ref(false)
const isInternalNoteModalOpen = ref(false)
const externalNoteActionType = ref('2')
const externalNoteMessageHtml = ref('')
const externalNoteError = ref('')
const isSubmittingExternalNote = ref(false)
const isExternalNoteModalOpen = ref(false)

// Preview state
const isPreviewOpen = ref(false)
const previewIndex = ref(0)
const previewUrl = ref<string | null>(null)

// Compare state
interface CompareItem {
  attachment: { id: string; filename: string; mimeType: string }
  previewUrl: string | null
  isLoading: boolean
}
const isCompareOpen = ref(false)
const compareItems = ref<CompareItem[]>([])

// Countdown timer for SLA deadlines
const firstResponseCountdown = ref('')
const customerUpdateCountdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

// Share state
const isShareDialogOpen = ref(false)
const shares = ref<CaseShare[]>([])
const isLoadingShares = ref(false)
const isCreatingShare = ref(false)
const newShareUrl = ref('')
const urlCopied = ref(false)

onMounted(async () => {
  await fetchCase(caseId)
  startCountdownTimer()
})

onUnmounted(() => {
  stopCountdownTimer()
  clearPreviewCache()
})

function getSLAKPIByName(name: string) {
  return currentCase.value?.slaKpis?.find((kpi) => kpi.name?.toLowerCase().includes(name.toLowerCase()))
}

function getFirstResponseSLA() {
  const kpi = getSLAKPIByName('first response')
  if (kpi) {
    return {
      deadline: kpi.failureTime || kpi.computedFailureTime,
      status: kpi.status,
      succeeded: kpi.succeededAt,
    }
  }
  return null
}

function getCustomerUpdateSLA() {
  const kpi = getSLAKPIByName('customer update')
  if (kpi) {
    return {
      deadline: kpi.failureTime || kpi.computedFailureTime,
      status: kpi.status,
      succeeded: kpi.succeededAt,
    }
  }
  return null
}

function updateCountdowns() {
  const firstResponse = getFirstResponseSLA()
  const customerUpdate = getCustomerUpdateSLA()

  if (firstResponse?.deadline && !firstResponse.succeeded) {
    firstResponseCountdown.value = formatCountdown(firstResponse.deadline)
  }

  if (customerUpdate?.deadline && !customerUpdate.succeeded) {
    customerUpdateCountdown.value = formatCountdown(customerUpdate.deadline)
  }
}

function startCountdownTimer() {
  updateCountdowns()
  countdownInterval = setInterval(updateCountdowns, 1000)
}

function stopCountdownTimer() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

async function handleSubmitInternalNote() {
  const subject = internalNoteSubject.value.trim()
  const description = internalNoteDescription.value
  if (!subject || !hasVisibleHtmlContent(description)) {
    internalNoteError.value = 'Subject and description are required'
    return
  }

  isSubmittingInternalNote.value = true
  internalNoteError.value = ''
  try {
    const result = await addInternalNote(caseId, subject, description)
    if (result.success) {
      internalNoteSubject.value = ''
      internalNoteDescription.value = ''
      isInternalNoteModalOpen.value = false
      await fetchCase(caseId, { forceRefresh: true })
    } else {
      internalNoteError.value = result.error || 'Failed to add internal note'
    }
  } finally {
    isSubmittingInternalNote.value = false
  }
}

async function handleSubmitExternalNote() {
  const actionType = Number(externalNoteActionType.value)
  const messageHtml = externalNoteMessageHtml.value

  if (![0, 1, 2].includes(actionType) || !hasVisibleHtmlContent(messageHtml)) {
    externalNoteError.value = 'Action type and message are required'
    return
  }

  isSubmittingExternalNote.value = true
  externalNoteError.value = ''
  try {
    const result = await addExternalNote(caseId, actionType as 0 | 1 | 2, messageHtml)
    if (result.success) {
      externalNoteActionType.value = '2'
      externalNoteMessageHtml.value = ''
      isExternalNoteModalOpen.value = false
      await fetchCase(caseId, { forceRefresh: true })
    } else {
      externalNoteError.value = result.error || 'Failed to add external note'
    }
  } finally {
    isSubmittingExternalNote.value = false
  }
}

function handleInternalNoteModalOpenChange(open: boolean) {
  isInternalNoteModalOpen.value = open
  if (!open) {
    internalNoteError.value = ''
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getCustomerFirstName(): string {
  const fullName = currentCase.value?.contact?.name?.trim()
    || currentCase.value?.customer?.name?.trim()
    || ''

  if (!fullName) return '{{customerFirstName}}'
  return fullName.split(/\s+/)[0]
}

function getSupportEngineerFullName(): string {
  const fullName = currentCase.value?.owner?.name?.trim() || ''
  return fullName || '{{SupportEngineerFullName}}'
}

function getExternalNoteTemplateHtml(): string {
  const customerFirstName = escapeHtml(getCustomerFirstName())
  const supportEngineerFullName = escapeHtml(getSupportEngineerFullName())

  return `<p>Hi ${customerFirstName},<br><br><br><br>Best Regards,<br>${supportEngineerFullName}</p>`
}

function handleExternalNoteModalOpenChange(open: boolean) {
  isExternalNoteModalOpen.value = open
  if (open) {
    if (!hasVisibleHtmlContent(externalNoteMessageHtml.value)) {
      externalNoteMessageHtml.value = getExternalNoteTemplateHtml()
    }
    return
  }

  externalNoteError.value = ''
}

function handleBack() {
  router.push('/cases')
}

async function handleDownloadAttachment(attachment: { id: string; filename: string }) {
  await downloadAttachment(caseId, attachment.id, attachment.filename)
}

async function handlePreviewAttachment(index: number) {
  const attachments = currentCase.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  isPreviewOpen.value = true
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(caseId, attachment.id)
  previewUrl.value = url
}

async function handleNavigatePreview(index: number) {
  const attachments = currentCase.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(caseId, attachment.id)
  previewUrl.value = url
}

function handleClosePreview() {
  isPreviewOpen.value = false
  previewUrl.value = null
}

async function handleCompareAttachments(indices: number[]) {
  const attachments = currentCase.value?.attachments || []
  if (indices.length < 2) return

  compareItems.value = indices.map(index => ({
    attachment: attachments[index],
    previewUrl: null,
    isLoading: true,
  }))
  isCompareOpen.value = true

  await Promise.all(
    indices.map(async (index, i) => {
      const attachment = attachments[index]
      const url = await getAttachmentPreviewUrl(caseId, attachment.id)
      if (compareItems.value[i]) {
        compareItems.value[i].previewUrl = url
        compareItems.value[i].isLoading = false
      }
    })
  )
}

function handleCloseCompare() {
  isCompareOpen.value = false
  compareItems.value = []
}

function handleRemoveFromCompare(index: number) {
  compareItems.value = compareItems.value.filter((_, i) => i !== index)
  if (compareItems.value.length < 2) {
    handleCloseCompare()
  }
}

// Share functions
async function openShareDialog() {
  isShareDialogOpen.value = true
  newShareUrl.value = ''
  urlCopied.value = false
  await fetchShares()
}

async function fetchShares() {
  isLoadingShares.value = true
  try {
    const response = await $fetch<CaseShare[]>(`/api/cases/${caseId}/shares`)
    shares.value = response
  } catch {
    shares.value = []
  } finally {
    isLoadingShares.value = false
  }
}

async function createShare(expiresInDays?: number) {
  isCreatingShare.value = true
  try {
    const response = await $fetch<CaseShare>(`/api/cases/${caseId}/share`, {
      method: 'POST',
      body: { expiresInDays },
    })
    const shareUrl = `${window.location.origin}/shared/${response.shareToken}`
    newShareUrl.value = shareUrl
    await fetchShares()
  } catch {
    // Failed to create share
  } finally {
    isCreatingShare.value = false
  }
}

async function copyShareUrl() {
  if (!newShareUrl.value) return
  await navigator.clipboard.writeText(newShareUrl.value)
  urlCopied.value = true
  setTimeout(() => {
    urlCopied.value = false
  }, 2000)
}

async function revokeShare(shareId: string) {
  try {
    await $fetch(`/api/shares/${shareId}`, { method: 'DELETE' })
    await fetchShares()
  } catch {
    // Failed to revoke share
  }
}

function formatShareExpiry(expiresAt?: number) {
  if (!expiresAt) return 'Never expires'
  const date = new Date(expiresAt)
  if (date < new Date()) return 'Expired'
  return `Expires ${date.toLocaleDateString()}`
}

function getShareUrl(token: string) {
  return `${window.location.origin}/shared/${token}`
}

async function copyExistingShareUrl(token: string) {
  const url = getShareUrl(token)
  await navigator.clipboard.writeText(url)
}
</script>

<template>
  <div>
    <CasesCaseDetailView
      :case="currentCase"
      :is-loading="isLoading"
      :is-downloading-attachment="isDownloadingAttachment"
      :is-preview-open="isPreviewOpen"
      :preview-index="previewIndex"
      :preview-url="previewUrl"
      :is-loading-preview="isLoadingPreview"
      :is-compare-open="isCompareOpen"
      :compare-items="compareItems"
      :first-response-s-l-a="getFirstResponseSLA()"
      :customer-update-s-l-a="getCustomerUpdateSLA()"
      :first-response-countdown="firstResponseCountdown"
      :customer-update-countdown="customerUpdateCountdown"
      :show-note-actions="true"
      :is-internal-note-modal-open="isInternalNoteModalOpen"
      :internal-note-subject="internalNoteSubject"
      :internal-note-description="internalNoteDescription"
      :is-submitting-internal-note="isSubmittingInternalNote"
      :internal-note-error="internalNoteError"
      :is-external-note-modal-open="isExternalNoteModalOpen"
      :external-note-action-type="externalNoteActionType"
      :external-note-message-html="externalNoteMessageHtml"
      :is-submitting-external-note="isSubmittingExternalNote"
      :external-note-error="externalNoteError"
      :show-share-button="true"
      @back="handleBack"
      @update:is-internal-note-modal-open="handleInternalNoteModalOpenChange"
      @update:internal-note-subject="internalNoteSubject = $event"
      @update:internal-note-description="internalNoteDescription = $event"
      @submit-internal-note="handleSubmitInternalNote"
      @update:is-external-note-modal-open="handleExternalNoteModalOpenChange"
      @update:external-note-action-type="externalNoteActionType = $event"
      @update:external-note-message-html="externalNoteMessageHtml = $event"
      @submit-external-note="handleSubmitExternalNote"
      @download-attachment="handleDownloadAttachment"
      @preview-attachment="handlePreviewAttachment"
      @navigate-preview="handleNavigatePreview"
      @close-preview="handleClosePreview"
      @compare-attachments="handleCompareAttachments"
      @close-compare="handleCloseCompare"
      @remove-from-compare="handleRemoveFromCompare"
      @share="openShareDialog"
    />

    <!-- Share Dialog -->
    <UiDialog v-model:open="isShareDialogOpen" title="Share Case" description="Create a public link to share this case" class="overflow-hidden">
      <div class="space-y-6 overflow-hidden">
        <!-- Create new share -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium">Create Share Link</h4>
          <div class="flex flex-wrap gap-2">
            <UiButton
              variant="outline"
              size="sm"
              :disabled="isCreatingShare"
              @click="createShare()"
            >
              <Link2 class="mr-2 h-4 w-4" />
              No Expiration
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="isCreatingShare"
              @click="createShare(7)"
            >
              <Clock class="mr-2 h-4 w-4" />
              7 Days
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="isCreatingShare"
              @click="createShare(30)"
            >
              <Clock class="mr-2 h-4 w-4" />
              30 Days
            </UiButton>
          </div>
        </div>

        <!-- New share URL -->
        <div v-if="newShareUrl" class="space-y-2">
          <h4 class="text-sm font-medium text-green-600">Link Created</h4>
          <div class="flex gap-2 min-w-0">
            <UiInput
              :model-value="newShareUrl"
              readonly
              class="flex-1 min-w-0 font-mono text-xs"
            />
            <UiButton variant="outline" size="icon" @click="copyShareUrl">
              <Check v-if="urlCopied" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4" />
            </UiButton>
          </div>
        </div>

        <!-- Existing shares -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium">Existing Share Links</h4>

          <div v-if="isLoadingShares" class="py-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>

          <div v-else-if="shares.length === 0" class="py-4 text-center text-sm text-muted-foreground">
            No active share links
          </div>

          <div v-else class="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden">
            <div
              v-for="share in shares"
              :key="share._id"
              class="flex items-center justify-between rounded-lg border p-3 text-sm min-w-0"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <Eye class="h-3 w-3" />
                  <span>{{ share.viewCount }} views</span>
                  <span class="text-muted-foreground/50">|</span>
                  <span>{{ formatShareExpiry(share.expiresAt) }}</span>
                </div>
                <div class="truncate font-mono text-xs mt-1 text-muted-foreground">
                  {{ getShareUrl(share.shareToken) }}
                </div>
              </div>
              <div class="flex gap-1 ml-2">
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="copyExistingShareUrl(share.shareToken)"
                >
                  <Copy class="h-4 w-4" />
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-destructive hover:text-destructive"
                  @click="revokeShare(share._id)"
                >
                  <Trash2 class="h-4 w-4" />
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="isShareDialogOpen = false">
          Close
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
