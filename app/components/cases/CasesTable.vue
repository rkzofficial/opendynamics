<script setup lang="ts">
import { Hash, FileText, Flag, Calendar, Clock, FolderOpen, ArrowUp, ArrowDown, ArrowUpDown, Info, Inbox } from 'lucide-vue-next'
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
  sortable?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

const props = withDefaults(defineProps<Props>(), {
  basePath: '/cases',
  emptyTitle: 'No cases found',
  emptyDescription: '',
  sortable: false,
  sortColumn: '',
  sortDirection: 'desc',
})

// Use composable as fallback for SLA data when prop not provided
const { caseSLAData: composableSLAData } = useCases()

// Use prop if provided, otherwise fall back to composable
const effectiveSLAData = computed(() => {
  // If prop has data, use it
  if (props.caseSLAData && Object.keys(props.caseSLAData).length > 0) {
    return props.caseSLAData
  }
  // Fall back to composable data
  return composableSLAData.value
})

const emit = defineEmits<{
  'sort-change': [column: string, direction: 'asc' | 'desc']
}>()

const router = useRouter()

interface ColumnConfig {
  key: string
  label: string
  icon: Component
  width: string
}

const columns: ColumnConfig[] = [
  { key: '#', label: '#', icon: Hash, width: 'w-[50px]' },
  { key: 'ticketnumber', label: 'Ticket', icon: Hash, width: 'w-[130px]' },
  { key: 'title', label: 'Title', icon: FileText, width: '' },
  { key: 'statuscode', label: 'Reason', icon: Info, width: 'w-[160px]' },
  { key: 'prioritycode', label: 'Priority', icon: Flag, width: 'w-[150px]' },
  { key: 'createdon', label: 'Created', icon: Calendar, width: 'w-[120px]' },
  { key: 'modifiedon', label: 'Modified', icon: Clock, width: 'w-[120px]' },
  { key: '_ent_queueid_value', label: 'Queue', icon: Inbox, width: 'w-[160px]' },
]

// Get status reason badge class - uses SLA colors for "In Progress" cases
function getStatusBadgeClass(caseItem: Case) {
  // For "In Progress" cases (statuscode === 1), use SLA-based colors
  if (caseItem.statuscode === 1) {
    const slaInfo = getCaseSLA(caseItem.incidentid)
    const slaStatus = getSLABadgeStatus(slaInfo, caseItem.statuscode)
    if (slaStatus !== 'none') {
      return getSLABadgeClass(slaStatus)
    }
  }
  // For other statuses, use default status reason colors
  return getStatusReasonBadgeClass(caseItem.statecode)
}

function handleRowClick(caseId: string) {
  router.push(`${props.basePath}/${caseId}`)
}

function handleSort(columnKey: string) {
  if (!props.sortable) return
  const newDirection = props.sortColumn === columnKey && props.sortDirection === 'desc' ? 'asc' : 'desc'
  emit('sort-change', columnKey, newDirection)
}

function getSortIcon(columnKey: string): Component {
  if (props.sortColumn !== columnKey) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

// Helper to get SLA info for a case (handles case sensitivity of GUIDs)
function getCaseSLA(caseId: string) {
  const data = effectiveSLAData.value
  // Try exact match first
  if (data[caseId]) {
    return data[caseId]
  }
  // Try lowercase match (Dynamics GUIDs can vary in casing)
  const lowerId = caseId.toLowerCase()
  return data[lowerId]
}
</script>

<template>
  <template v-if="cases.length > 0">
    <!-- Mobile: Card list -->
    <CasesCardList
      class="md:hidden"
      :cases="cases"
      :case-sla-data="caseSLAData"
      :base-path="basePath"
      :empty-title="emptyTitle"
      :empty-description="emptyDescription"
    />

    <!-- Desktop: Table -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full min-w-[1100px] table-fixed">
        <thead>
          <tr class="border-b bg-muted/50">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'h-12 px-3 text-left align-middle font-medium text-muted-foreground',
                col.width,
                col.key !== '#' && sortable ? 'cursor-pointer select-none hover:bg-muted/80 transition-colors' : ''
              ]"
              @click="col.key !== '#' && handleSort(col.key)"
            >
              <span class="flex items-center gap-1.5">
                <component :is="col.icon" class="h-3.5 w-3.5" />
                {{ col.label }}
                <component
                  v-if="sortable && col.key !== '#'"
                  :is="getSortIcon(col.key)"
                  :class="[
                    'h-3.5 w-3.5 ml-auto',
                    sortColumn === col.key ? 'text-foreground' : 'text-muted-foreground/50'
                  ]"
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="(c, index) in cases"
            :key="c.incidentid"
            class="group transition-colors hover:bg-muted/50 cursor-pointer"
            @click="handleRowClick(c.incidentid)"
          >
            <td class="h-14 px-3 align-middle">
              <span class="text-sm text-muted-foreground">{{ index + 1 }}</span>
            </td>
            <td class="h-14 px-3 align-middle">
              <span class="font-mono text-sm font-medium text-primary">
                {{ c.ticketnumber }}
              </span>
            </td>
            <td class="px-3 py-3 align-middle overflow-hidden">
              <UiTooltip :content="c.description" position="bottom" max-width="450px">
                <div class="overflow-hidden">
                  <p class="truncate font-medium">{{ c.title }}</p>
                  <p v-if="c.description" class="truncate text-sm text-muted-foreground mt-0.5">
                    {{ c.description }}
                  </p>
                </div>
              </UiTooltip>
            </td>
            <td class="h-14 px-3 align-middle">
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                  getStatusBadgeClass(c)
                ]"
              >
                {{ getStatusReasonLabel(c['statuscode@OData.Community.Display.V1.FormattedValue']) }}
              </span>
            </td>
            <td class="h-14 px-3 align-middle">
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  getPriorityBadgeClass(c.prioritycode)
                ]"
              >
                {{ getPriorityLabel(c.prioritycode) }}
              </span>
            </td>
            <td class="h-14 px-3 align-middle">
              <span :title="formatCaseDate(c.createdon, true).tooltip" class="text-sm text-muted-foreground">
                {{ formatCaseDate(c.createdon, true).text }}
              </span>
            </td>
            <td class="h-14 px-3 align-middle">
              <span :title="formatCaseDate(c.modifiedon, true).tooltip" class="text-sm text-muted-foreground">
                {{ formatCaseDate(c.modifiedon, true).text }}
              </span>
            </td>
            <td class="h-14 px-3 align-middle">
              <span class="text-sm text-muted-foreground">
                {{ c['_ent_queueid_value@OData.Community.Display.V1.FormattedValue'] || '—' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>

  <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <FolderOpen class="h-8 w-8 opacity-50" />
    </div>
    <p class="font-medium">{{ emptyTitle }}</p>
    <p v-if="emptyDescription" class="text-sm mt-1">{{ emptyDescription }}</p>
  </div>
</template>
