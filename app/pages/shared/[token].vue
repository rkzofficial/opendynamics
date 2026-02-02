<script setup lang="ts">
import { onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { formatCountdown } from '~/utils/caseHelpers'
import type { Case, ActivitiesResponse, SLAKPIsResponse, CaseAttachment } from '~/types'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const shareToken = route.params.token as string

// State
const currentCase = ref<Case | null>(null)
const activities = ref<ActivitiesResponse | null>(null)
const slaKPIs = ref<SLAKPIsResponse | null>(null)
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

// Compare state
interface CompareItem {
  attachment: CaseAttachment
  previewUrl: string | null
  isLoading: boolean
}
const isCompareOpen = ref(false)
const compareItems = ref<CompareItem[]>([])

// Preview cache
const previewCache = new Map<string, string>()

// Countdown timer for SLA deadlines
const firstResponseCountdown = ref('')
const customerUpdateCountdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

async function fetchCase() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await $fetch<Case>(`/api/shared/${shareToken}`)
    currentCase.value = response
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { message?: string } }
    if (e.statusCode === 410) {
      error.value = e.data?.message || 'This share link is no longer valid'
    } else if (e.statusCode === 404) {
      error.value = 'Share link not found'
    } else {
      error.value = 'Failed to load case'
    }
  } finally {
    isLoading.value = false
  }
}

async function fetchActivities() {
  isLoadingActivities.value = true
  try {
    const response = await $fetch<ActivitiesResponse>(`/api/shared/${shareToken}/activities`)
    activities.value = response
  } catch {
    // Silently fail - activities are supplementary
  } finally {
    isLoadingActivities.value = false
  }
}

async function fetchSLAKPIs() {
  isLoadingSLAKPIs.value = true
  try {
    const response = await $fetch<SLAKPIsResponse>(`/api/shared/${shareToken}/sla-kpis`)
    slaKPIs.value = response
  } catch {
    // Silently fail - SLA KPIs are supplementary
  } finally {
    isLoadingSLAKPIs.value = false
  }
}

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

async function handleDownloadAttachment(attachment: CaseAttachment) {
  isDownloadingAttachment.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/shared/${shareToken}/attachment/${attachment.annotationid}`
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
  } catch {
    // Silently fail
  } finally {
    isDownloadingAttachment.value = false
  }
}

async function getAttachmentPreviewUrl(annotationId: string): Promise<string | null> {
  // Check cache first
  if (previewCache.has(annotationId)) {
    return previewCache.get(annotationId)!
  }

  isLoadingPreview.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/shared/${shareToken}/attachment/${annotationId}`
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
    previewCache.set(annotationId, url)

    return url
  } catch {
    return null
  } finally {
    isLoadingPreview.value = false
  }
}

function clearPreviewCache() {
  for (const url of previewCache.values()) {
    URL.revokeObjectURL(url)
  }
  previewCache.clear()
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

async function handleCompareAttachments(indices: number[]) {
  const attachments = activities.value?.attachments || []
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
      const url = await getAttachmentPreviewUrl(attachment.annotationid)
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

function handleBack() {
  // In public view, just go to login
  navigateTo('/login')
}

onMounted(async () => {
  await fetchCase()
  if (!error.value) {
    await Promise.all([fetchActivities(), fetchSLAKPIs()])
    startCountdownTimer()
  }
})

onUnmounted(() => {
  stopCountdownTimer()
  clearPreviewCache()
})
</script>

<template>
  <div class="container max-w-7xl mx-auto">
    <!-- Error state -->
    <div v-if="error" class="flex flex-col items-center justify-center py-20">
      <UiCard class="max-w-md w-full">
        <UiCardContent class="py-12 text-center">
          <AlertTriangle class="mx-auto h-12 w-12 mb-4 text-destructive" />
          <h2 class="text-xl font-semibold mb-2">Unable to Load Case</h2>
          <p class="text-muted-foreground mb-6">{{ error }}</p>
          <UiButton @click="navigateTo('/login')">
            Sign In
          </UiButton>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Case detail view -->
    <CasesCaseDetailView
      v-else
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
      @back="handleBack"
      @download-attachment="handleDownloadAttachment"
      @preview-attachment="handlePreviewAttachment"
      @navigate-preview="handleNavigatePreview"
      @close-preview="handleClosePreview"
      @compare-attachments="handleCompareAttachments"
      @close-compare="handleCloseCompare"
      @remove-from-compare="handleRemoveFromCompare"
    />
  </div>
</template>
