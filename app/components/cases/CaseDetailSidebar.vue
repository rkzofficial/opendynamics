<script setup lang="ts">
import {
  Info,
  Hash,
  Clock,
  Shield,
  User,
  Building,
  Mail,
  Phone,
  Languages,
  Globe,
  AlertTriangle,
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
        <div class="flex items-center gap-2 flex-wrap">
          <UiBadge :variant="getStatusVariant(props.case.statecode)" class="gap-1">
            <component :is="getStatusIcon(props.case.statecode)" class="h-3 w-3" />
            {{ getStatusLabel(props.case.statecode) }}
          </UiBadge>
          <UiBadge :variant="getPriorityVariant(props.case.prioritycode)" class="gap-1">
            <component :is="getPriorityIcon(props.case.prioritycode)" class="h-3 w-3" />
            {{ getPriorityLabel(props.case.prioritycode) }}
          </UiBadge>
        </div>

        <!-- Basic Info -->
        <div class="space-y-3 rounded-md bg-muted/50 p-3">
          <div class="flex items-center gap-3">
            <Hash class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Ticket Number</p>
              <p class="text-sm font-medium">{{ props.case.ticketnumber }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Clock class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground">Created</p>
              <p :title="formatCaseDate(props.case.createdon).tooltip" class="text-sm">{{ formatCaseDate(props.case.createdon).text }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Modified</p>
              <p :title="formatCaseDate(props.case.modifiedon).tooltip" class="text-sm">{{ formatCaseDate(props.case.modifiedon).text }}</p>
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
                <p v-if="firstResponseSLA?.succeeded" :title="formatCaseDate(firstResponseSLA?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                  Completed {{ formatCaseDate(firstResponseSLA?.succeeded).text }}
                </p>
                <p v-else-if="firstResponseSLA?.deadline" class="text-sm font-mono font-medium">
                  {{ firstResponseCountdown || formatCaseDate(firstResponseSLA?.deadline).text }}
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
                <p v-if="customerUpdateSLA?.succeeded" :title="formatCaseDate(customerUpdateSLA?.succeeded).tooltip" class="text-sm text-green-600 font-medium">
                  Completed {{ formatCaseDate(customerUpdateSLA?.succeeded).text }}
                </p>
                <p v-else-if="customerUpdateSLA?.deadline" class="text-sm font-mono font-medium">
                  {{ customerUpdateCountdown || formatCaseDate(customerUpdateSLA?.deadline).text }}
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
            <p class="text-sm">{{ props.case.ent_productentitlement?.['ent_supportlevel@OData.Community.Display.V1.FormattedValue'] || props.case.entitlementid?.name || 'Not set' }}</p>
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
            <p class="text-sm font-medium">{{ props.case['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || props.case.customerid_contact?.fullname || 'Not set' }}</p>
          </div>
        </div>
        <!-- Organization -->
        <div class="flex items-center gap-3">
          <Building class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Organization</p>
            <p class="text-sm">{{ props.case.customerid_account?.name || 'Not set' }}</p>
          </div>
        </div>
        <!-- Email -->
        <div class="flex items-center gap-3">
          <Mail class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Email</p>
            <p class="text-sm">{{ props.case.ent_preferredemail || props.case.customerid_contact?.emailaddress1 || 'Not set' }}</p>
          </div>
        </div>
        <!-- Customer 360 -->
        <div v-if="props.case['_ent_customer_value@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
          <User class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Customer 360</p>
            <p class="text-sm">{{ props.case['_ent_customer_value@OData.Community.Display.V1.FormattedValue'] }}</p>
          </div>
        </div>
        <!-- Phone -->
        <div v-if="props.case.ent_preferredphonenumber" class="flex items-center gap-3">
          <Phone class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Phone</p>
            <p class="text-sm">{{ props.case.ent_preferredphonenumber }}</p>
          </div>
        </div>
        <!-- Language -->
        <div v-if="props.case['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
          <Languages class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Language</p>
            <p class="text-sm">{{ props.case['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'] }}</p>
          </div>
        </div>
        <!-- Time Zone -->
        <div v-if="getTimezoneName(props.case.ent_preferredcustomertimezone)" class="flex items-center gap-3">
          <Globe class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Time Zone</p>
            <p class="text-sm">{{ getTimezoneName(props.case.ent_preferredcustomertimezone) }}</p>
          </div>
        </div>
        <!-- Working Hours -->
        <div v-if="props.case.ent_custworkhrsstarttime !== undefined && props.case.ent_custworkhrsendtime !== undefined" class="flex items-center gap-3">
          <Clock class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Working Hours</p>
            <p class="text-sm">{{ props.case.ent_custworkhrsstarttime }}:00 - {{ props.case.ent_custworkhrsendtime }}:00</p>
          </div>
        </div>
        <!-- Three Strike Preference -->
        <div v-if="props.case['ent_threestrikepreference@OData.Community.Display.V1.FormattedValue']" class="flex items-center gap-3">
          <AlertTriangle class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Three Strike Preference</p>
            <p class="text-sm">{{ props.case['ent_threestrikepreference@OData.Community.Display.V1.FormattedValue'] }}</p>
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
