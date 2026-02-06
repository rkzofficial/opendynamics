<script setup lang="ts">
import { FolderOpen, Calendar, Clock, Inbox } from 'lucide-vue-next'
import type { Case, CaseSLAInfo } from '~/types'
import {
  getStatusReasonLabel,
  getStatusReasonBadgeClass,
  getPriorityLabel,
  getPriorityBadgeClass,
  formatCaseDate,
  getSLABadgeStatus,
  getSLABadgeClass,
} from '~/utils/caseHelpers'

interface Props {
  cases: Case[]
  caseSLAData?: Record<string, CaseSLAInfo>
  basePath?: string
  emptyTitle?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  basePath: '/cases',
  emptyTitle: 'No cases found',
  emptyDescription: '',
})

const router = useRouter()

// Use composable as fallback for SLA data when prop not provided
const { caseSLAData: composableSLAData } = useCases()

const effectiveSLAData = computed(() => {
  if (props.caseSLAData && Object.keys(props.caseSLAData).length > 0) {
    return props.caseSLAData
  }
  return composableSLAData.value
})

function getCaseSLA(caseId: string) {
  const data = effectiveSLAData.value
  if (data[caseId]) return data[caseId]
  return data[caseId.toLowerCase()]
}

function getStatusBadgeClass(caseItem: Case) {
  if (caseItem.statuscode === 1) {
    const slaInfo = getCaseSLA(caseItem.incidentid)
    const slaStatus = getSLABadgeStatus(slaInfo, caseItem.statuscode)
    if (slaStatus !== 'none') {
      return getSLABadgeClass(slaStatus)
    }
  }
  return getStatusReasonBadgeClass(caseItem.statecode)
}

function handleCardClick(caseId: string) {
  router.push(`${props.basePath}/${caseId}`)
}
</script>

<template>
  <div v-if="cases.length > 0" class="divide-y">
    <div
      v-for="c in cases"
      :key="c.incidentid"
      class="px-4 py-3 active:bg-muted/50 cursor-pointer transition-colors"
      @click="handleCardClick(c.incidentid)"
    >
      <!-- Row 1: Priority badge (left) + Status reason badge (right) -->
      <div class="flex items-center justify-between gap-2">
        <span
          :class="[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            getPriorityBadgeClass(c.prioritycode)
          ]"
        >
          {{ getPriorityLabel(c.prioritycode) }}
        </span>
        <span
          :class="[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            getStatusBadgeClass(c)
          ]"
        >
          {{ getStatusReasonLabel(c['statuscode@OData.Community.Display.V1.FormattedValue']) }}
        </span>
      </div>

      <!-- Row 2: Ticket number -->
      <p class="mt-2 font-mono text-sm font-medium text-primary">
        {{ c.ticketnumber }}
      </p>

      <!-- Row 3: Title -->
      <p class="mt-0.5 font-medium line-clamp-1">
        {{ c.title }}
      </p>

      <!-- Row 4: Description preview -->
      <p v-if="c.description" class="mt-0.5 text-sm text-muted-foreground line-clamp-2">
        {{ c.description }}
      </p>

      <!-- Row 5: Dates + Queue -->
      <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span class="flex items-center gap-3">
          <span class="flex items-center gap-1" :title="formatCaseDate(c.createdon, true).tooltip">
            <Calendar class="h-3 w-3" />
            {{ formatCaseDate(c.createdon, true).text }}
          </span>
          <span class="flex items-center gap-1" :title="formatCaseDate(c.modifiedon, true).tooltip">
            <Clock class="h-3 w-3" />
            {{ formatCaseDate(c.modifiedon, true).text }}
          </span>
        </span>
        <span
          v-if="c['_ent_queueid_value@OData.Community.Display.V1.FormattedValue']"
          class="flex items-center gap-1"
        >
          <Inbox class="h-3 w-3" />
          {{ c['_ent_queueid_value@OData.Community.Display.V1.FormattedValue'] }}
        </span>
      </div>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <FolderOpen class="h-8 w-8 opacity-50" />
    </div>
    <p class="font-medium">{{ emptyTitle }}</p>
    <p v-if="emptyDescription" class="text-sm mt-1">{{ emptyDescription }}</p>
  </div>
</template>
