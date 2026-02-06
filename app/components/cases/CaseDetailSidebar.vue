<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Info,
  Hash,
  Clock,
  Shield,
  User,
  Mail,
  Phone,
  Languages,
  Globe,
  Timer,
} from 'lucide-vue-next'
import type { CaseDetail } from '~/types'
import {
  formatCaseDate,
  getTimezoneName,
  getTimezoneIANA,
} from '~/utils/caseHelpers'

interface SLAData {
  deadline?: string
  status?: number
  succeeded?: string
}

interface Props {
  case: CaseDetail
  firstResponseSLA?: SLAData | null
  customerUpdateSLA?: SLAData | null
  firstResponseCountdown?: string
  customerUpdateCountdown?: string
}

const props = withDefaults(defineProps<Props>(), {
  firstResponseCountdown: '',
  customerUpdateCountdown: '',
})

// Reactive time for customer timezone
const now = ref(new Date())
let timeInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timeInterval = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

const customerCurrentTime = computed(() => {
  const ianaTimezone = getTimezoneIANA(props.case.customerPreferences?.timezoneCode)
  if (!ianaTimezone) return '--:--'

  try {
    return now.value.toLocaleTimeString('en-US', {
      timeZone: ianaTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '--:--'
  }
})

function formatDatePart(dateString: string | null | undefined): string {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimePart(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
</script>

<template>
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
        <!-- Ticket Number -->
        <div class="flex items-center gap-3 rounded-md border bg-background p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500/10">
            <Hash class="h-4 w-4 text-slate-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted-foreground">Ticket Number</p>
            <p class="text-sm font-medium font-mono">{{ props.case.ticketNumber }}</p>
          </div>
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
              <Clock class="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] text-muted-foreground leading-none">Created</p>
              <p :title="formatCaseDate(props.case.createdAt).tooltip" class="mt-0.5">
                <span class="text-xs font-medium">{{ formatDatePart(props.case.createdAt) }}</span>
                <span class="text-[10px] text-muted-foreground ml-1">{{ formatTimePart(props.case.createdAt) }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
              <Clock class="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] text-muted-foreground leading-none">Modified</p>
              <p :title="formatCaseDate(props.case.modifiedAt).tooltip" class="mt-0.5">
                <span class="text-xs font-medium">{{ formatDatePart(props.case.modifiedAt) }}</span>
                <span class="text-[10px] text-muted-foreground ml-1">{{ formatTimePart(props.case.modifiedAt) }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- SLA Section -->
        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">SLA Status</p>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0" :class="firstResponseSLA?.succeeded ? 'bg-green-500/10' : 'bg-rose-500/10'">
                <Timer class="h-3.5 w-3.5" :class="firstResponseSLA?.succeeded ? 'text-green-500' : 'text-rose-500'" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">First Response</p>
                <p v-if="firstResponseSLA?.succeeded" :title="formatCaseDate(firstResponseSLA?.succeeded).tooltip" class="text-xs font-medium mt-0.5 text-green-600">
                  Done
                </p>
                <p v-else-if="firstResponseSLA?.deadline" class="text-xs font-medium mt-0.5 font-mono">
                  {{ firstResponseCountdown || formatCaseDate(firstResponseSLA?.deadline).text }}
                </p>
                <p v-else class="text-xs text-muted-foreground mt-0.5">Not set</p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0" :class="customerUpdateSLA?.succeeded ? 'bg-green-500/10' : 'bg-rose-500/10'">
                <Clock class="h-3.5 w-3.5" :class="customerUpdateSLA?.succeeded ? 'text-green-500' : 'text-rose-500'" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Customer Update</p>
                <p v-if="customerUpdateSLA?.succeeded" :title="formatCaseDate(customerUpdateSLA?.succeeded).tooltip" class="text-xs font-medium mt-0.5 text-green-600">
                  Done
                </p>
                <p v-else-if="customerUpdateSLA?.deadline" class="text-xs font-medium mt-0.5 font-mono">
                  {{ customerUpdateCountdown || formatCaseDate(customerUpdateSLA?.deadline).text }}
                </p>
                <p v-else class="text-xs text-muted-foreground mt-0.5">Not set</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Support Plan -->
        <div class="flex items-center gap-3 rounded-md border bg-background p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
            <Shield class="h-4 w-4 text-purple-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted-foreground">Support Plan</p>
            <p class="text-sm font-medium">{{ props.case.supportLevel || props.case.entitlement?.name || 'Not set' }}</p>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Customer info -->
    <UiCard>
      <UiCardHeader class="pb-3">
        <UiCardTitle class="flex items-center gap-2">
          <User class="h-4 w-4 text-muted-foreground" />
          Customer
        </UiCardTitle>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <!-- Contact Header -->
        <div class="text-center pb-2">
          <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-lg shadow-md">
            {{ (props.case.contact?.name || props.case.customer?.name || '?').charAt(0).toUpperCase() }}
          </div>
          <h3 class="mt-3 font-semibold text-base">
            {{ props.case.contact?.name || props.case.customer?.name || 'Not set' }}
          </h3>
          <div v-if="props.case.account?.name" class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-muted text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            {{ props.case.account.name }}
          </div>
          <p v-if="props.case.customer360" class="text-xs text-muted-foreground mt-2">
            {{ props.case.customer360 }}
          </p>
        </div>

        <!-- Contact Details -->
        <div class="grid gap-2">
          <a
            v-if="props.case.customerPreferences?.email || props.case.customer?.email"
            :href="`mailto:${props.case.customerPreferences?.email || props.case.customer?.email}`"
            class="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
              <Mail class="h-4 w-4 text-blue-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="text-sm font-medium truncate">{{ props.case.customerPreferences?.email || props.case.customer?.email }}</p>
            </div>
          </a>
          <div
            v-else
            class="flex items-center gap-3 rounded-md border border-dashed bg-background p-3"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Mail class="h-4 w-4 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="text-sm text-muted-foreground">Not set</p>
            </div>
          </div>
          <a
            v-if="props.case.customerPreferences?.phone"
            :href="`tel:${props.case.customerPreferences.phone}`"
            class="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
              <Phone class="h-4 w-4 text-green-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Phone</p>
              <p class="text-sm font-medium">{{ props.case.customerPreferences.phone }}</p>
            </div>
          </a>
        </div>

        <!-- Preferences -->
        <div
          v-if="props.case.customerPreferences?.language || getTimezoneName(props.case.customerPreferences?.timezoneCode) || (props.case.customerPreferences?.workHoursStart !== undefined && props.case.customerPreferences?.workHoursEnd !== undefined)"
          class="space-y-2"
        >
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Preferences</p>
          <div class="grid grid-cols-2 gap-2">
            <div v-if="props.case.customerPreferences?.language" class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10">
                <Languages class="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Language</p>
                <p class="text-xs font-medium mt-0.5 truncate">{{ props.case.customerPreferences.language }}</p>
              </div>
            </div>
            <div v-if="props.case.customerPreferences?.workHoursStart !== undefined && props.case.customerPreferences?.workHoursEnd !== undefined" class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10">
                <Clock class="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Work Hours</p>
                <p class="text-xs font-medium mt-0.5">{{ props.case.customerPreferences.workHoursStart }}:00 - {{ props.case.customerPreferences.workHoursEnd }}:00</p>
              </div>
            </div>
            <div v-if="getTimezoneName(props.case.customerPreferences?.timezoneCode)" class="col-span-2 flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 flex-shrink-0">
                <Globe class="h-3.5 w-3.5 text-cyan-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Timezone</p>
                <p class="text-xs font-medium mt-0.5">{{ getTimezoneName(props.case.customerPreferences?.timezoneCode) }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-[10px] text-muted-foreground leading-none">Current Time</p>
                <p class="text-xs font-medium mt-0.5 font-mono">{{ customerCurrentTime }}</p>
              </div>
            </div>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

  </div>
</template>
