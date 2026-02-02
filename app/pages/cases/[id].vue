<script setup lang="ts">
import { onUnmounted } from 'vue'
import { formatCountdown } from '~/utils/caseHelpers'

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

// Countdown timer for SLA deadlines
const firstResponseCountdown = ref('')
const customerUpdateCountdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

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
    @back="handleBack"
    @submit-reply="handleSubmitReply"
    @download-attachment="handleDownloadAttachment"
    @preview-attachment="handlePreviewAttachment"
    @navigate-preview="handleNavigatePreview"
    @close-preview="handleClosePreview"
  />
</template>
