<script setup lang="ts">
import { onUnmounted } from 'vue'
import { formatCountdown } from '~/utils/caseHelpers'
import type { CaseDetail, AttachmentItem } from '~/types'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.userId as string)
const caseId = computed(() => route.params.caseId as string)

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

const replyText = ref('')
const replySubject = ref('')
const isSubmitting = ref(false)

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

async function handleSubmitReply() {
  if (!replyText.value.trim() || !userId.value || !caseId.value) return

  isSubmitting.value = true
  try {
    await $fetch(`/api/cases/${caseId.value}/reply`, {
      method: 'POST',
      params: { userId: userId.value },
      body: {
        text: replyText.value,
        subject: replySubject.value || undefined
      }
    })
    replyText.value = ''
    replySubject.value = ''
    // Reload the full case to get updated activities
    await loadCase()
  } catch (e) {
    // Silent fail for reply
  } finally {
    isSubmitting.value = false
  }
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
    v-model:reply-subject="replySubject"
    v-model:reply-text="replyText"
    :is-submitting="isSubmitting"
    :admin-user-info="adminUserInfo"
    :error="error"
    @back="handleBack"
    @submit-reply="handleSubmitReply"
    @download-attachment="handleDownloadAttachment"
    @preview-attachment="handlePreviewAttachment"
    @navigate-preview="handleNavigatePreview"
    @close-preview="handleClosePreview"
    @compare-attachments="handleCompareAttachments"
    @close-compare="handleCloseCompare"
    @remove-from-compare="handleRemoveFromCompare"
  />
</template>
