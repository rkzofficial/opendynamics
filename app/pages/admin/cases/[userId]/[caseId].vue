<script setup lang="ts">
import { onUnmounted } from 'vue'
import { ArrowLeft, Send, Mail, Phone, FileText, MessageSquare, Calendar, Users, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, Hash, CircleDot, Flag, Clock, Timer, User, Building, Shield, Info, AlertTriangle, FolderOpen } from 'lucide-vue-next'
import type { Activity, Annotation } from '~/types'
import { processEmailHtml } from '~/utils/email-processor'
import { formatTimeAgo } from '~/utils/timeAgo'

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
const error = ref('')

// Countdown timer for SLA deadlines
const firstResponseCountdown = ref('')
const customerUpdateCountdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

function formatCountdown(targetDate: string): string {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const diff = target - now

  if (diff <= 0) {
    return 'Overdue'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else {
    return `${minutes}m ${seconds}s`
  }
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

onUnmounted(() => {
  stopCountdownTimer()
})

const replyText = ref('')
const replySubject = ref('')
const isSubmitting = ref(false)

// Get selected user info
const selectedUser = computed(() => {
  return users.value.find(u => u._id === userId.value)
})

onMounted(async () => {
  await fetchUsersWithDynamics()
  await loadCase()
})

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
    console.error('Failed to load activities:', e)
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
    console.error('Failed to load SLA KPIs:', e)
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

function getSLAStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'In Progress'
    case 1: return 'Noncompliant'
    case 2: return 'Nearing Noncompliance'
    case 3: return 'Paused'
    case 4: return 'Succeeded'
    case 5: return 'Canceled'
    default: return 'Unknown'
  }
}

function getSLAStatusVariant(status: number): 'default' | 'destructive' | 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 0: return 'default'
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    case 4: return 'success'
    case 5: return 'secondary'
    default: return 'secondary'
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
    console.error('Failed to add reply:', e)
  } finally {
    isSubmitting.value = false
  }
}

function getStatusLabel(statecode: number) {
  switch (statecode) {
    case 0: return 'Active'
    case 1: return 'Resolved'
    case 2: return 'Cancelled'
    default: return 'Unknown'
  }
}

function getStatusVariant(statecode: number): 'default' | 'success' | 'secondary' {
  switch (statecode) {
    case 0: return 'default'
    case 1: return 'success'
    case 2: return 'secondary'
    default: return 'secondary'
  }
}

function getPriorityLabel(prioritycode: number) {
  switch (prioritycode) {
    case 1: return 'High'
    case 2: return 'Normal'
    case 3: return 'Low'
    default: return 'Unknown'
  }
}

function getPriorityVariant(prioritycode: number): 'destructive' | 'warning' | 'secondary' {
  switch (prioritycode) {
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    default: return 'secondary'
  }
}

function getStatusIcon(statecode: number) {
  switch (statecode) {
    case 0: return AlertCircle
    case 1: return CheckCircle
    case 2: return XCircle
    default: return AlertCircle
  }
}

function getPriorityIcon(prioritycode: number) {
  switch (prioritycode) {
    case 1: return ArrowUp
    case 2: return Minus
    case 3: return ArrowDown
    default: return Minus
  }
}

function formatDate(dateString: string | null | undefined) {
  return formatTimeAgo(dateString)
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'email': return Mail
    case 'phonecall': return Phone
    case 'task': return FileText
    default: return MessageSquare
  }
}

function getActivityContent(activity: Activity): string {
  if (activity.activitytypecode === 'email' && activity.attachments) {
    return processEmailHtml(activity.description || '', activity.attachments)
  }
  return activity.description || ''
}

function getUserDisplayName(user: typeof selectedUser.value): string {
  if (!user) return 'Unknown User'
  if (user.name) return `${user.name} (${user.username})`
  if (user.email) return `${user.username} (${user.email})`
  return user.username
}

interface TimelineItem {
  id: string
  type: 'activity' | 'annotation'
  data: Activity | Annotation
  date: string
}

const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  if (activities.value?.activities) {
    for (const activity of activities.value.activities) {
      items.push({
        id: activity.activityid,
        type: 'activity',
        data: activity,
        date: activity.createdon,
      })
    }
  }

  if (activities.value?.annotations) {
    for (const annotation of activities.value.annotations) {
      items.push({
        id: annotation.annotationid,
        type: 'annotation',
        data: annotation,
        date: annotation.createdon,
      })
    }
  }

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

function goBack() {
  router.push(`/admin/cases/${userId.value}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" @click="goBack">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Cases
      </UiButton>
    </div>

    <!-- User info card -->
    <UiCard class="bg-muted/50">
      <UiCardContent class="py-4">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary/10 p-2">
            <Users class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Viewing case for user</p>
            <p class="font-medium">
              {{ getUserDisplayName(selectedUser) }}
            </p>
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

    <template v-else-if="currentCase">
      <!-- Case header -->
      <div class="sticky top-16 z-30 -mx-4 -mt-4 mb-6 bg-background px-4 py-4 md:-mx-6 md:-mt-6 md:px-6 md:py-6 border-b">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-sm font-medium text-muted-foreground">
                {{ currentCase.ticketnumber }}
              </span>
              <UiBadge :variant="getStatusVariant(currentCase.statecode)" class="gap-1">
                <component :is="getStatusIcon(currentCase.statecode)" class="h-3 w-3" />
                {{ getStatusLabel(currentCase.statecode) }}
              </UiBadge>
              <UiBadge :variant="getPriorityVariant(currentCase.prioritycode)" class="gap-1">
                <component :is="getPriorityIcon(currentCase.prioritycode)" class="h-3 w-3" />
                {{ getPriorityLabel(currentCase.prioritycode) }}
              </UiBadge>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">{{ currentCase.title }}</h1>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Description -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Description</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <p v-if="currentCase.description" class="whitespace-pre-wrap">
                {{ currentCase.description }}
              </p>
              <p v-else class="text-muted-foreground italic">No description provided</p>
            </UiCardContent>
          </UiCard>

          <!-- Reply box -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Add Note</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <div>
                <UiLabel for="subject">Subject (optional)</UiLabel>
                <UiInput
                  id="subject"
                  v-model="replySubject"
                  placeholder="Note subject..."
                />
              </div>
              <div>
                <UiLabel for="note">Note</UiLabel>
                <UiTextarea
                  id="note"
                  v-model="replyText"
                  placeholder="Write your note here..."
                  :rows="4"
                />
              </div>
              <UiButton
                :disabled="!replyText.trim() || isSubmitting"
                @click="handleSubmitReply"
              >
                <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
                <Send v-else class="mr-2 h-4 w-4" />
                Add Note
              </UiButton>
            </UiCardContent>
          </UiCard>

          <!-- Activity timeline -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Activity Timeline</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div v-if="isLoadingActivities" class="space-y-4">
                <UiSkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
              </div>

              <div v-else-if="timelineItems.length === 0" class="text-center py-8 text-muted-foreground">
                <MessageSquare class="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No activities yet</p>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="item in timelineItems"
                  :key="item.id"
                  class="flex gap-4 p-4 rounded-lg border"
                >
                  <div class="flex-shrink-0">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <component
                        :is="item.type === 'annotation' ? FileText : getActivityIcon((item.data as Activity).activitytypecode)"
                        class="h-5 w-5"
                      />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium">
                        {{ item.type === 'annotation'
                          ? ((item.data as Annotation).subject || 'Note')
                          : ((item.data as Activity).subject || (item.data as Activity).activitytypecode)
                        }}
                      </span>
                      <span :title="formatDate(item.date).tooltip" class="text-xs text-muted-foreground">
                        {{ formatDate(item.date).text }}
                      </span>
                    </div>
                    <div
                      v-if="item.type === 'activity'"
                      :class="[
                        'text-sm prose prose-sm max-w-none p-3 rounded border',
                        (item.data as Activity).activitytypecode === 'email'
                          ? 'bg-white text-gray-900 border-gray-200'
                          : 'text-muted-foreground border-transparent'
                      ]"
                      v-html="getActivityContent(item.data as Activity)"
                    />
                    <p
                      v-else
                      class="text-sm text-muted-foreground whitespace-pre-wrap"
                    >
                      {{ (item.data as Annotation).notetext }}
                    </p>
                    <div v-if="item.type === 'annotation' && (item.data as Annotation).createdby?.fullname" class="mt-1 text-xs text-muted-foreground">
                      By {{ (item.data as Annotation).createdby?.fullname }}
                    </div>
                  </div>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6 lg:sticky lg:top-48 lg:self-start">
          <!-- Case info -->
          <UiCard>
            <UiCardHeader class="pb-3">
              <UiCardTitle class="flex items-center gap-2">
                <Info class="h-4 w-4 text-muted-foreground" />
                Case Information
              </UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <!-- Status & Priority -->
              <div class="flex items-center gap-2 flex-wrap">
                <UiBadge :variant="getStatusVariant(currentCase.statecode)" class="gap-1">
                  <component :is="getStatusIcon(currentCase.statecode)" class="h-3 w-3" />
                  {{ getStatusLabel(currentCase.statecode) }}
                </UiBadge>
                <UiBadge :variant="getPriorityVariant(currentCase.prioritycode)" class="gap-1">
                  <component :is="getPriorityIcon(currentCase.prioritycode)" class="h-3 w-3" />
                  {{ getPriorityLabel(currentCase.prioritycode) }}
                </UiBadge>
              </div>

              <!-- Basic Info -->
              <div class="space-y-3 rounded-md bg-muted/50 p-3">
                <div class="flex items-center gap-3">
                  <Hash class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Ticket Number</p>
                    <p class="text-sm font-medium">{{ currentCase.ticketnumber }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Clock class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-muted-foreground">Created</p>
                    <p :title="formatDate(currentCase.createdon).tooltip" class="text-sm">{{ formatDate(currentCase.createdon).text }}</p>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Modified</p>
                    <p :title="formatDate(currentCase.modifiedon).tooltip" class="text-sm">{{ formatDate(currentCase.modifiedon).text }}</p>
                  </div>
                </div>
              </div>

              <!-- SLA Section -->
              <div class="space-y-3 rounded-md bg-muted/50 p-3">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">SLA Status</p>
                <div class="flex items-start gap-3">
                  <Timer class="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-muted-foreground">First Response</p>
                    <div v-if="isLoadingSLAKPIs" class="text-sm text-muted-foreground">Loading...</div>
                    <template v-else>
                      <p v-if="getFirstResponseSLA()?.succeeded" :title="formatDate(getFirstResponseSLA()?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                        Completed {{ formatDate(getFirstResponseSLA()?.succeeded).text }}
                      </p>
                      <p v-else-if="getFirstResponseSLA()?.deadline" class="text-sm font-mono font-medium">
                        {{ firstResponseCountdown || formatDate(getFirstResponseSLA()?.deadline).text }}
                      </p>
                      <p v-else class="text-sm text-muted-foreground">Not set</p>
                    </template>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <Clock class="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-muted-foreground">Customer Update</p>
                    <div v-if="isLoadingSLAKPIs" class="text-sm text-muted-foreground">Loading...</div>
                    <template v-else>
                      <p v-if="getCustomerUpdateSLA()?.succeeded" :title="formatDate(getCustomerUpdateSLA()?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                        Completed {{ formatDate(getCustomerUpdateSLA()?.succeeded).text }}
                      </p>
                      <p v-else-if="getCustomerUpdateSLA()?.deadline" class="text-sm font-mono font-medium">
                        {{ customerUpdateCountdown || formatDate(getCustomerUpdateSLA()?.deadline).text }}
                      </p>
                      <p v-else class="text-sm text-muted-foreground">Not set</p>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Contact & Organization -->
              <div class="space-y-3 rounded-md bg-muted/50 p-3">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Info</p>
                <div class="flex items-center gap-3">
                  <User class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Primary Contact</p>
                    <p class="text-sm">{{ currentCase.primarycontactid?.fullname || 'Not set' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Building class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Organization</p>
                    <p class="text-sm">{{ currentCase.customerid_account?.name || 'Not set' }}</p>
                  </div>
                </div>
                <div v-if="currentCase.additionalContactName" class="flex items-center gap-3">
                  <User class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Additional Contact</p>
                    <p class="text-sm">{{ currentCase.additionalContactName }}</p>
                  </div>
                </div>
              </div>

              <!-- Support Plan -->
              <div class="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                <Shield class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Support Plan</p>
                  <p class="text-sm">{{ currentCase.entitlementid?.name || 'Not set' }}</p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Customer info -->
          <UiCard v-if="currentCase.customerid_contact">
            <UiCardHeader>
              <UiCardTitle>Customer</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-2">
              <p class="font-medium">{{ currentCase.customerid_contact.fullname }}</p>
              <p v-if="currentCase.customerid_contact.emailaddress1" class="text-sm text-muted-foreground">
                {{ currentCase.customerid_contact.emailaddress1 }}
              </p>
            </UiCardContent>
          </UiCard>

          <!-- Owner info -->
          <UiCard v-if="currentCase.ownerid">
            <UiCardHeader>
              <UiCardTitle>Owner</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <p class="font-medium">{{ currentCase.ownerid.fullname }}</p>
            </UiCardContent>
          </UiCard>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <UiCard v-else>
      <UiCardContent class="py-12 text-center">
        <AlertTriangle class="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p class="text-muted-foreground">Case not found</p>
        <UiButton variant="outline" class="mt-4" @click="goBack">
          Go Back
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
