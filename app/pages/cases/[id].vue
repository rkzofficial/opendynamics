<script setup lang="ts">
import { onUnmounted } from 'vue'
import { Copy, Check, Trash2, Eye, Clock, Link2 } from 'lucide-vue-next'
import { formatCountdown } from '~/utils/caseHelpers'
import type { CaseShare } from '~/types'

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const {
  currentCase,
  activities,
  slaKPIs,
  isLoading,
  isLoadingActivities,
  isLoadingSLAKPIs,
  isDownloadingAttachment,
  isLoadingPreview,
  fetchCase,
  fetchActivities,
  fetchSLAKPIs,
  addReply,
  downloadAttachment,
  getAttachmentPreviewUrl,
  clearPreviewCache,
} = useCases()

const replyText = ref('')
const replySubject = ref('')
const isSubmitting = ref(false)

// Preview state
const isPreviewOpen = ref(false)
const previewIndex = ref(0)
const previewUrl = ref<string | null>(null)

// Compare state
interface CompareItem {
  attachment: { annotationid: string; filename: string; mimetype: string }
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
  await fetchActivities(caseId)
  await fetchSLAKPIs(caseId)
  startCountdownTimer()
})

onUnmounted(() => {
  stopCountdownTimer()
  clearPreviewCache()
})

function getSLAKPIByName(name: string) {
  return slaKPIs.value?.slakpis?.find((kpi) => kpi.name?.toLowerCase().includes(name.toLowerCase()))
}

function getFirstResponseSLA() {
  const kpi = getSLAKPIByName('first response')
  if (kpi) {
    return {
      deadline: kpi.failuretime || kpi.computedfailuretime,
      status: kpi.status,
      succeeded: kpi.succeededon,
    }
  }
  return null
}

function getCustomerUpdateSLA() {
  const kpi = getSLAKPIByName('customer update')
  if (kpi) {
    return {
      deadline: kpi.failuretime || kpi.computedfailuretime,
      status: kpi.status,
      succeeded: kpi.succeededon,
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

async function handleSubmitReply() {
  if (!replyText.value.trim()) return

  isSubmitting.value = true
  try {
    const result = await addReply(caseId, replyText.value, replySubject.value || undefined)
    if (result.success) {
      replyText.value = ''
      replySubject.value = ''
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleBack() {
  router.push('/cases')
}

async function handleDownloadAttachment(attachment: { annotationid: string; filename: string }) {
  await downloadAttachment(caseId, attachment.annotationid, attachment.filename)
}

async function handlePreviewAttachment(index: number) {
  const attachments = activities.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  isPreviewOpen.value = true
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(caseId, attachment.annotationid)
  previewUrl.value = url
}

async function handleNavigatePreview(index: number) {
  const attachments = activities.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(caseId, attachment.annotationid)
  previewUrl.value = url
}

function handleClosePreview() {
  isPreviewOpen.value = false
  previewUrl.value = null
}

async function handleCompareAttachments(indices: number[]) {
  const attachments = activities.value?.attachments || []
  if (indices.length < 2) return

  // Initialize compare items with loading state
  compareItems.value = indices.map(index => ({
    attachment: attachments[index],
    previewUrl: null,
    isLoading: true,
  }))
  isCompareOpen.value = true

  // Fetch preview URLs in parallel
  await Promise.all(
    indices.map(async (index, i) => {
      const attachment = attachments[index]
      const url = await getAttachmentPreviewUrl(caseId, attachment.annotationid)
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
  // Close compare modal if less than 2 items remain
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
      :activities="activities"
      :is-loading="isLoading"
      :is-loading-activities="isLoadingActivities"
      :is-loading-s-l-a-k-p-is="isLoadingSLAKPIs"
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
      v-model:reply-subject="replySubject"
      v-model:reply-text="replyText"
      :is-submitting="isSubmitting"
      :show-share-button="true"
      @back="handleBack"
      @submit-reply="handleSubmitReply"
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
