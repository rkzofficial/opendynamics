<script setup lang="ts">
import { onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { formatCountdown } from '~/utils/caseHelpers'
import type { CaseDetail, AttachmentItem } from '~/types'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const shareToken = route.params.token as string

// State
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
    const response = await $fetch<CaseDetail>(`/api/shared/${shareToken}`)
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

async function handleDownloadAttachment(attachment: AttachmentItem) {
  isDownloadingAttachment.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/shared/${shareToken}/attachment/${attachment.id}`
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

async function getAttachmentPreviewUrl(attachmentId: string): Promise<string | null> {
  // Check cache first
  if (previewCache.has(attachmentId)) {
    return previewCache.get(attachmentId)!
  }

  isLoadingPreview.value = true
  try {
    const response = await $fetch<{ documentbody: string; filename: string; mimetype: string }>(
      `/api/shared/${shareToken}/attachment/${attachmentId}`
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
    previewCache.set(attachmentId, url)

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

  compareItems.value = indices.map(index => ({
    attachment: attachments[index],
    previewUrl: null,
    isLoading: true,
  }))
  isCompareOpen.value = true

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
