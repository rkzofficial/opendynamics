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
import type { Case } from '~/types'
import {
  getStatusLabel,
  getStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getStatusIcon,
  getPriorityIcon,
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
  case: Case
  firstResponseSLA?: SLAData | null
  customerUpdateSLA?: SLAData | null
  firstResponseCountdown?: string
  customerUpdateCountdown?: string
  isLoadingSLAKPIs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoadingSLAKPIs: false,
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
  const ianaTimezone = getTimezoneIANA(props.case.ent_preferredcustomertimezone)
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
        <!-- Status & Priority -->
        <div class="flex items-center justify-center gap-2">
          <UiBadge :variant="getStatusVariant(props.case.statecode)" class="gap-1.5 px-3 py-1">
            <component :is="getStatusIcon(props.case.statecode)" class="h-3.5 w-3.5" />
            {{ getStatusLabel(props.case.statecode) }}
          </UiBadge>
          <UiBadge :variant="getPriorityVariant(props.case.prioritycode)" class="gap-1.5 px-3 py-1">
            <component :is="getPriorityIcon(props.case.prioritycode)" class="h-3.5 w-3.5" />
            {{ getPriorityLabel(props.case.prioritycode) }}
          </UiBadge>
        </div>

        <!-- Ticket Number -->
        <div class="flex items-center gap-3 rounded-md border bg-background p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500/10">
            <Hash class="h-4 w-4 text-slate-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted-foreground">Ticket Number</p>
            <p class="text-sm font-medium font-mono">{{ props.case.ticketnumber }}</p>
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
              <p :title="formatCaseDate(props.case.createdon).tooltip" class="mt-0.5">
                <span class="text-xs font-medium">{{ formatDatePart(props.case.createdon) }}</span>
                <span class="text-[10px] text-muted-foreground ml-1">{{ formatTimePart(props.case.createdon) }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
              <Clock class="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] text-muted-foreground leading-none">Modified</p>
              <p :title="formatCaseDate(props.case.modifiedon).tooltip" class="mt-0.5">
                <span class="text-xs font-medium">{{ formatDatePart(props.case.modifiedon) }}</span>
                <span class="text-[10px] text-muted-foreground ml-1">{{ formatTimePart(props.case.modifiedon) }}</span>
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
                <div v-if="isLoadingSLAKPIs" class="text-xs text-muted-foreground mt-0.5">Loading...</div>
                <template v-else>
                  <p v-if="firstResponseSLA?.succeeded" :title="formatCaseDate(firstResponseSLA?.succeeded).tooltip" class="text-xs font-medium mt-0.5 text-green-600">
                    Done
                  </p>
                  <p v-else-if="firstResponseSLA?.deadline" class="text-xs font-medium mt-0.5 font-mono">
                    {{ firstResponseCountdown || formatCaseDate(firstResponseSLA?.deadline).text }}
                  </p>
                  <p v-else class="text-xs text-muted-foreground mt-0.5">Not set</p>
                </template>
              </div>
            </div>
            <div class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0" :class="customerUpdateSLA?.succeeded ? 'bg-green-500/10' : 'bg-rose-500/10'">
                <Clock class="h-3.5 w-3.5" :class="customerUpdateSLA?.succeeded ? 'text-green-500' : 'text-rose-500'" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Customer Update</p>
                <div v-if="isLoadingSLAKPIs" class="text-xs text-muted-foreground mt-0.5">Loading...</div>
                <template v-else>
                  <p v-if="customerUpdateSLA?.succeeded" :title="formatCaseDate(customerUpdateSLA?.succeeded).tooltip" class="text-xs font-medium mt-0.5 text-green-600">
                    Done
                  </p>
                  <p v-else-if="customerUpdateSLA?.deadline" class="text-xs font-medium mt-0.5 font-mono">
                    {{ customerUpdateCountdown || formatCaseDate(customerUpdateSLA?.deadline).text }}
                  </p>
                  <p v-else class="text-xs text-muted-foreground mt-0.5">Not set</p>
                </template>
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
            <p class="text-sm font-medium">{{ props.case.ent_productentitlement?.['ent_supportlevel@OData.Community.Display.V1.FormattedValue'] || props.case.entitlementid?.name || 'Not set' }}</p>
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
            {{ (props.case['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || props.case.customerid_contact?.fullname || '?').charAt(0).toUpperCase() }}
          </div>
          <h3 class="mt-3 font-semibold text-base">
            {{ props.case['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || props.case.customerid_contact?.fullname || 'Not set' }}
          </h3>
          <div v-if="props.case.customerid_account?.name" class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-muted text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            {{ props.case.customerid_account.name }}
          </div>
          <p v-if="props.case['_ent_customer_value@OData.Community.Display.V1.FormattedValue']" class="text-xs text-muted-foreground mt-2">
            {{ props.case['_ent_customer_value@OData.Community.Display.V1.FormattedValue'] }}
          </p>
        </div>

        <!-- Contact Details -->
        <div class="grid gap-2">
          <a
            v-if="props.case.ent_preferredemail || props.case.customerid_contact?.emailaddress1"
            :href="`mailto:${props.case.ent_preferredemail || props.case.customerid_contact?.emailaddress1}`"
            class="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
              <Mail class="h-4 w-4 text-blue-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="text-sm font-medium truncate">{{ props.case.ent_preferredemail || props.case.customerid_contact?.emailaddress1 }}</p>
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
            v-if="props.case.ent_preferredphonenumber"
            :href="`tel:${props.case.ent_preferredphonenumber}`"
            class="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
              <Phone class="h-4 w-4 text-green-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Phone</p>
              <p class="text-sm font-medium">{{ props.case.ent_preferredphonenumber }}</p>
            </div>
          </a>
        </div>

        <!-- Preferences -->
        <div
          v-if="props.case['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'] || getTimezoneName(props.case.ent_preferredcustomertimezone) || (props.case.ent_custworkhrsstarttime !== undefined && props.case.ent_custworkhrsendtime !== undefined)"
          class="space-y-2"
        >
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Preferences</p>
          <div class="grid grid-cols-2 gap-2">
            <div v-if="props.case['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10">
                <Languages class="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Language</p>
                <p class="text-xs font-medium mt-0.5 truncate">{{ props.case['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'] }}</p>
              </div>
            </div>
            <div v-if="props.case.ent_custworkhrsstarttime !== undefined && props.case.ent_custworkhrsendtime !== undefined" class="flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10">
                <Clock class="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Work Hours</p>
                <p class="text-xs font-medium mt-0.5">{{ props.case.ent_custworkhrsstarttime }}:00 - {{ props.case.ent_custworkhrsendtime }}:00</p>
              </div>
            </div>
            <div v-if="getTimezoneName(props.case.ent_preferredcustomertimezone)" class="col-span-2 flex items-center gap-2.5 rounded-md border bg-background p-2.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 flex-shrink-0">
                <Globe class="h-3.5 w-3.5 text-cyan-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-muted-foreground leading-none">Timezone</p>
                <p class="text-xs font-medium mt-0.5">{{ getTimezoneName(props.case.ent_preferredcustomertimezone) }}</p>
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

    <!-- Owner info -->
    <UiCard v-if="props.case.ownerid">
      <UiCardHeader>
        <UiCardTitle>Owner</UiCardTitle>
      </UiCardHeader>
      <UiCardContent>
        <p class="font-medium">{{ props.case.ownerid.fullname }}</p>
      </UiCardContent>
    </UiCard>
  </div>
</template>
