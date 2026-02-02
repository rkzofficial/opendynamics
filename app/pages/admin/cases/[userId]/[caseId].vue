<script setup lang="ts">
import { onUnmounted } from 'vue'
import { formatCountdown } from '~/utils/caseHelpers'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.userId as string)
const caseId = computed(() => route.params.caseId as string)

const {
  users,
  slaKPIs,
  fetchUsersWithDynamics,
  fetchCaseDetails,
  fetchSLAKPIs,
} = useAdminCases()

const currentCase = ref<any>(null)
const activities = ref<any>(null)
const isLoading = ref(true)
const isLoadingActivities = ref(false)
const isLoadingSLAKPIs = ref(false)
const isDownloadingAttachment = ref(false)
const isLoadingPreview = ref(false)
const error = ref('')

// Preview state
const isPreviewOpen = ref(false)
const previewIndex = ref(0)
const previewUrl = ref<string | null>(null)

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
    currentCase.value = await fetchCaseDetails(userId.value, caseId.value)
    await Promise.all([
      loadActivities(),
      loadSLAKPIs()
    ])
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to load case details'
  } finally {
    isLoading.value = false
  }
}

async function loadActivities() {
  if (!userId.value || !caseId.value) return

  isLoadingActivities.value = true
  try {
    activities.value = await $fetch(`/api/cases/${caseId.value}/activities`, {
      params: { userId: userId.value }
    })
  } catch (e) {
    // Silent fail for activities
  } finally {
    isLoadingActivities.value = false
  }
}

async function loadSLAKPIs() {
  if (!userId.value || !caseId.value) return

  isLoadingSLAKPIs.value = true
  try {
    await fetchSLAKPIs(userId.value, caseId.value)
    startCountdownTimer()
  } catch (e) {
    // Silent fail for SLA KPIs
  } finally {
    isLoadingSLAKPIs.value = false
  }
}

function getSLAKPIByName(name: string) {
  return slaKPIs.value?.slakpis?.find((kpi: any) => kpi.name?.toLowerCase().includes(name.toLowerCase()))
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
    await loadActivities()
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

async function handleDownloadAttachment(attachment: { annotationid: string; filename: string }) {
  if (!caseId.value) return
  isDownloadingAttachment.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/cases/${caseId.value}/attachments/${attachment.annotationid}`,
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

async function getAttachmentPreviewUrl(annotationId: string): Promise<string | null> {
  if (!caseId.value) return null

  // Check cache first
  const cacheKey = `${caseId.value}:${annotationId}`
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!
  }

  isLoadingPreview.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/cases/${caseId.value}/attachments/${annotationId}`,
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
  const attachments = activities.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  isPreviewOpen.value = true
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(attachment.annotationid)
  previewUrl.value = url
}

async function handleNavigatePreview(index: number) {
  const attachments = activities.value?.attachments || []
  if (index < 0 || index >= attachments.length) return

  previewIndex.value = index
  previewUrl.value = null

  const attachment = attachments[index]
  const url = await getAttachmentPreviewUrl(attachment.annotationid)
  previewUrl.value = url
}

function handleClosePreview() {
  isPreviewOpen.value = false
  previewUrl.value = null
}
</script>

<template>
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
  />
</template>
