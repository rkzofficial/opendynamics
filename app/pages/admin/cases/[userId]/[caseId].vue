<script setup lang="ts">
import { onUnmounted } from 'vue'
import { ArrowLeft, Send, Mail, Phone, FileText, MessageSquare, Calendar, Users, Hash, Clock, Timer, User, Building, Shield, Info, AlertTriangle, FolderOpen, Globe, Languages } from 'lucide-vue-next'
import type { Activity, Annotation } from '~/types'
import { processEmailHtml } from '~/utils/email-processor'
import {
  getStatusLabel,
  getStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getStatusIcon,
  getPriorityIcon,
  formatCaseDate,
} from '~/utils/caseHelpers'

// Windows timezone code to readable name mapping (common codes)
const timezoneCodeMap: Record<number, string> = {
  0: '(UTC-12:00) International Date Line West',
  1: '(UTC-11:00) Coordinated Universal Time-11',
  2: '(UTC-10:00) Hawaii',
  4: '(UTC-09:00) Alaska',
  10: '(UTC-08:00) Pacific Time (US & Canada)',
  15: '(UTC-07:00) Mountain Time (US & Canada)',
  20: '(UTC-06:00) Central Time (US & Canada)',
  35: '(UTC-05:00) Eastern Time (US & Canada)',
  45: '(UTC-04:00) Atlantic Time (Canada)',
  65: '(UTC) Dublin, Edinburgh, Lisbon, London',
  85: '(UTC+01:00) Amsterdam, Berlin, Rome, Paris',
  110: '(UTC+02:00) Cairo, Helsinki, Kyiv',
  130: '(UTC+03:00) Moscow, Baghdad, Kuwait',
  145: '(UTC+04:00) Abu Dhabi, Muscat',
  165: '(UTC+05:00) Islamabad, Karachi',
  175: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
  185: '(UTC+06:00) Dhaka, Astana',
  195: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
  205: '(UTC+08:00) Beijing, Hong Kong, Singapore',
  210: '(UTC+08:00) Kuala Lumpur, Singapore',
  215: '(UTC+08:00) Taipei',
  225: '(UTC+08:00) Perth',
  230: '(UTC+09:00) Tokyo, Seoul',
  235: '(UTC+09:00) Osaka, Sapporo, Tokyo',
  245: '(UTC+09:30) Adelaide, Darwin',
  250: '(UTC+10:00) Brisbane, Canberra, Sydney',
  255: '(UTC+10:00) Hobart',
  265: '(UTC+11:00) Solomon Islands, New Caledonia',
  275: '(UTC+12:00) Auckland, Wellington, Fiji',
  290: '(UTC+13:00) Nuku\'alofa, Samoa',
}

function getTimezoneName(code: number | undefined): string | null {
  if (code === undefined || code === null) return null
  return timezoneCodeMap[code] || `UTC Timezone (Code: ${code})`
}

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
                      <span :title="formatCaseDate(item.date).tooltip" class="text-xs text-muted-foreground">
                        {{ formatCaseDate(item.date).text }}
                      </span>
                    </div>
                    <div
                      v-if="item.type === 'activity'"
                      :class="[
                        'text-sm prose prose-sm max-w-full overflow-x-auto [&_img]:max-w-full [&_table]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto p-3 rounded border',
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
        <div class="space-y-6">
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
                    <p :title="formatCaseDate(currentCase.createdon).tooltip" class="text-sm">{{ formatCaseDate(currentCase.createdon).text }}</p>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Modified</p>
                    <p :title="formatCaseDate(currentCase.modifiedon).tooltip" class="text-sm">{{ formatCaseDate(currentCase.modifiedon).text }}</p>
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
                      <p v-if="getFirstResponseSLA()?.succeeded" :title="formatCaseDate(getFirstResponseSLA()?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                        Completed {{ formatCaseDate(getFirstResponseSLA()?.succeeded).text }}
                      </p>
                      <p v-else-if="getFirstResponseSLA()?.deadline" class="text-sm font-mono font-medium">
                        {{ firstResponseCountdown || formatCaseDate(getFirstResponseSLA()?.deadline).text }}
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
                      <p v-if="getCustomerUpdateSLA()?.succeeded" :title="formatCaseDate(getCustomerUpdateSLA()?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                        Completed {{ formatCaseDate(getCustomerUpdateSLA()?.succeeded).text }}
                      </p>
                      <p v-else-if="getCustomerUpdateSLA()?.deadline" class="text-sm font-mono font-medium">
                        {{ customerUpdateCountdown || formatCaseDate(getCustomerUpdateSLA()?.deadline).text }}
                      </p>
                      <p v-else class="text-sm text-muted-foreground">Not set</p>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Support Plan -->
              <div class="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                <Shield class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Support Plan</p>
                  <p class="text-sm">{{ currentCase.ent_productentitlement?.['ent_supportlevel@OData.Community.Display.V1.FormattedValue'] || currentCase.entitlementid?.name || 'Not set' }}</p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Customer info -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Customer</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-3">
              <!-- Primary Contact -->
              <div class="flex items-center gap-3">
                <User class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Primary Contact</p>
                  <p class="text-sm font-medium">{{ currentCase['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || currentCase.customerid_contact?.fullname || 'Not set' }}</p>
                </div>
              </div>
              <!-- Organization -->
              <div class="flex items-center gap-3">
                <Building class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Organization</p>
                  <p class="text-sm">{{ currentCase.customerid_account?.name || 'Not set' }}</p>
                </div>
              </div>
              <!-- Email -->
              <div class="flex items-center gap-3">
                <Mail class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Email</p>
                  <p class="text-sm">{{ currentCase.ent_preferredemail || currentCase.customerid_contact?.emailaddress1 || 'Not set' }}</p>
                </div>
              </div>
              <!-- Customer 360 -->
              <div v-if="currentCase['_ent_customer_value@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
                <User class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Customer 360</p>
                  <p class="text-sm">{{ currentCase['_ent_customer_value@OData.Community.Display.V1.FormattedValue'] }}</p>
                </div>
              </div>
              <!-- Phone -->
              <div v-if="currentCase.ent_preferredphonenumber" class="flex items-center gap-3">
                <Phone class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Phone</p>
                  <p class="text-sm">{{ currentCase.ent_preferredphonenumber }}</p>
                </div>
              </div>
              <!-- Language -->
              <div v-if="currentCase['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
                <Languages class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Language</p>
                  <p class="text-sm">{{ currentCase['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'] }}</p>
                </div>
              </div>
              <!-- Time Zone -->
              <div v-if="getTimezoneName(currentCase.ent_preferredcustomertimezone)" class="flex items-center gap-3">
                <Globe class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Time Zone</p>
                  <p class="text-sm">{{ getTimezoneName(currentCase.ent_preferredcustomertimezone) }}</p>
                </div>
              </div>
              <!-- Working Hours -->
              <div v-if="currentCase.ent_custworkhrsstarttime !== undefined && currentCase.ent_custworkhrsendtime !== undefined" class="flex items-center gap-3">
                <Clock class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Working Hours</p>
                  <p class="text-sm">{{ currentCase.ent_custworkhrsstarttime }}:00 - {{ currentCase.ent_custworkhrsendtime }}:00</p>
                </div>
              </div>
              <!-- Three Strike Preference -->
              <div v-if="currentCase['ent_threestrikepreference@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
                <AlertTriangle class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">Three Strike Preference</p>
                  <p class="text-sm">{{ currentCase['ent_threestrikepreference@OData.Community.Display.V1.FormattedValue'] }}</p>
                </div>
              </div>
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
