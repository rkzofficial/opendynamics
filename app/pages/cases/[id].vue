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
    :is-compare-open="isCompareOpen"
    :compare-items="compareItems"
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
    @compare-attachments="handleCompareAttachments"
    @close-compare="handleCloseCompare"
    @remove-from-compare="handleRemoveFromCompare"
  />
</template>
