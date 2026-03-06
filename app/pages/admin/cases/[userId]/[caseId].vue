<script setup lang="ts">
import { onUnmounted } from 'vue'
import { formatCountdown } from '~/utils/caseHelpers'
import { hasVisibleHtmlContent } from '~/utils/html'
import type { CaseDetail, AttachmentItem } from '~/types'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.userId as string)
const caseId = computed(() => route.params.caseId as string)
const { trigger } = useHaptics()

const {
  users,
  fetchUsersWithDynamics,
  fetchCaseDetails,
} = useAdminCases()

const currentCase = ref<CaseDetail | null>(null)
const isLoading = ref(true)
const isDownloadingAttachment = ref(false)
const isLoadingPreview = ref(false)
const error = ref('')

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

// Preview cache for admin page
const previewCache = new Map<string, string>()

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

// Countdown timer for SLA deadlines
const firstResponseCountdown = ref('')
const customerUpdateCountdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

// Get selected user info
const selectedUser = computed(() => {
  return users.value.find(u => u._id === userId.value)
})

const adminUserInfo = computed(() => {
  if (!selectedUser.value) return undefined
  return { name: getUserDisplayName(selectedUser.value) }
})

onMounted(async () => {
  await fetchUsersWithDynamics()
  await loadCase()
})

onUnmounted(() => {
  stopCountdownTimer()
  clearPreviewCache()
})

function clearPreviewCache() {
  for (const url of previewCache.values()) {
    URL.revokeObjectURL(url)
  }
  previewCache.clear()
}

async function loadCase() {
  if (!userId.value || !caseId.value) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await fetchCaseDetails(userId.value, caseId.value)
    currentCase.value = result
    startCountdownTimer()
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to load case details'
  } finally {
    isLoading.value = false
  }
}

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
  if (!subject || !hasVisibleHtmlContent(description) || !userId.value || !caseId.value) {
    internalNoteError.value = 'Subject and description are required'
    trigger('error')
    return
  }

  isSubmittingInternalNote.value = true
  internalNoteError.value = ''
  try {
    await $fetch(`/api/cases/${caseId.value}/internal-notes`, {
      method: 'POST',
      params: { userId: userId.value },
      body: {
        subject,
        description,
      }
    })
    internalNoteSubject.value = ''
    internalNoteDescription.value = ''
    isInternalNoteModalOpen.value = false
    trigger('success')
    // Reload full case and bypass cache to include latest timeline entries
    const result = await fetchCaseDetails(userId.value, caseId.value, { forceRefresh: true })
    currentCase.value = result
  } catch {
    internalNoteError.value = 'Failed to add internal note'
    trigger('error')
  } finally {
    isSubmittingInternalNote.value = false
  }
}

async function handleSubmitExternalNote() {
  const actionType = Number(externalNoteActionType.value)
  const messageHtml = externalNoteMessageHtml.value

  if (![0, 1, 2].includes(actionType) || !hasVisibleHtmlContent(messageHtml) || !userId.value || !caseId.value) {
    externalNoteError.value = 'Action type and message are required'
    trigger('error')
    return
  }

  isSubmittingExternalNote.value = true
  externalNoteError.value = ''
  try {
    await $fetch(`/api/cases/${caseId.value}/external-notes`, {
      method: 'POST',
      params: { userId: userId.value },
      body: {
        actionType,
        messageHtml,
      }
    })
    externalNoteActionType.value = '2'
    externalNoteMessageHtml.value = ''
    isExternalNoteModalOpen.value = false
    trigger('success')
    const result = await fetchCaseDetails(userId.value, caseId.value, { forceRefresh: true })
    currentCase.value = result
  } catch {
    externalNoteError.value = 'Failed to add external note'
    trigger('error')
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

function getUserDisplayName(user: typeof selectedUser.value): string {
  if (!user) return 'Unknown User'
  if (user.name) return `${user.name} (${user.username})`
  if (user.email) return `${user.username} (${user.email})`
  return user.username
}

function handleBack() {
  router.push(`/admin/cases/${userId.value}`)
}

async function handleDownloadAttachment(attachment: { id: string; filename: string }) {
  if (!caseId.value) return
  isDownloadingAttachment.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/cases/${caseId.value}/attachments/${attachment.id}`,
      { params: { userId: userId.value } }
    )

    // Convert base64 to blob
    const byteCharacters = atob(response.documentbody)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: response.mimetype })

    // Trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.filename || response.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    // Silent fail
  } finally {
    isDownloadingAttachment.value = false
  }
}

async function getAttachmentPreviewUrl(attachmentId: string): Promise<string | null> {
  if (!caseId.value) return null

  // Check cache first
  const cacheKey = `${caseId.value}:${attachmentId}`
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!
  }

  isLoadingPreview.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/cases/${caseId.value}/attachments/${attachmentId}`,
      { params: { userId: userId.value } }
    )

    // Convert base64 to blob
    const byteCharacters = atob(response.documentbody)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: response.mimetype })

    // Create blob URL and cache it
    const url = URL.createObjectURL(blob)
    previewCache.set(cacheKey, url)

    return url
  } catch (e) {
    return null
  } finally {
    isLoadingPreview.value = false
  }
}

async function handlePreviewAttachment(index: number) {
  const attachments = currentCase.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  isPreviewOpen.value = true
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(attachment.id)
  previewUrl.value = url
}

async function handleNavigatePreview(index: number) {
  const attachments = currentCase.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(attachment.id)
  previewUrl.value = url
}

function handleClosePreview() {
  isPreviewOpen.value = false
  previewUrl.value = null
}

async function handleCompareAttachments(indices: number[]) {
  const attachments = currentCase.value?.attachments || []
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
      const url = await getAttachmentPreviewUrl(attachment.id)
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
</script>

<template>
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
    :admin-user-info="adminUserInfo"
    :error="error"
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
  />
</template>
