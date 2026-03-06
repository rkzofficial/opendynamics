<script setup lang="ts">
import { Search, RefreshCw, AlertCircle, AlertOctagon, AlertTriangle, CheckCircle, XCircle, Circle, CircleDot, Flag, X, Timer, Inbox } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import type { CaseListItem, StatusReasonOption } from '~/types'
import { getSLABadgeStatus } from '~/utils/caseHelpers'

interface Props {
  cases: CaseListItem[]
  isLoading: boolean
  isRefreshing?: boolean
  hasMore: boolean
  canGoBack: boolean
  basePath: string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  initialSearch?: string
  initialStatus?: string
  initialStatusReason?: string
  initialPriority?: string
  initialSortColumn?: string
  initialSortDirection?: 'asc' | 'desc'
  statusReasonOptions?: StatusReasonOption[]
  initialDxPendingRelease?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
  emptyTitle: 'No cases found',
  emptyDescription: 'Try adjusting your filters',
  initialSearch: '',
  initialStatus: 'active',
  initialStatusReason: 'all',
  initialPriority: 'all',
  initialSortColumn: 'modifiedon',
  initialSortDirection: 'desc',
  statusReasonOptions: () => [],
  initialDxPendingRelease: false,
  isRefreshing: false,
})

// Show skeleton only for initial load, not for refresh
const showSkeleton = computed(() => props.isLoading && !props.isRefreshing)

const emit = defineEmits<{
  refresh: [filters: { search: string; status: string; statusReason: string; priority: string; dxPendingRelease: boolean; orderBy: string; orderDirection: 'asc' | 'desc' }]
  previous: []
  next: []
  filterChange: [filters: { search: string; status: string; statusReason: string; priority: string; dxPendingRelease: boolean; orderBy: string; orderDirection: 'asc' | 'desc' }]
  pageSizeChange: [size: number]
}>()

const searchQuery = ref(props.initialSearch)
const statusFilter = ref(props.initialStatus)
const statusReasonFilter = ref(props.initialStatusReason)
const priorityFilter = ref(props.initialPriority)
const dxPendingReleaseFilter = ref(props.initialDxPendingRelease)
const slaFilter = ref('all')
const sortColumn = ref(props.initialSortColumn)
const sortDirection = ref<'asc' | 'desc'>(props.initialSortDirection)

// Map status filter values to state codes
const statusToState: Record<string, number> = {
  'active': 0,
  'resolved': 1,
  'cancelled': 2,
}

// Group status reason options by parent state, filtered by selected status
const groupedStatusReasons = computed(() => {
  const groups = [
    { label: 'Active', state: 0, options: [] as StatusReasonOption[] },
    { label: 'Resolved', state: 1, options: [] as StatusReasonOption[] },
    { label: 'Cancelled', state: 2, options: [] as StatusReasonOption[] },
  ]

  for (const opt of props.statusReasonOptions) {
    const group = groups.find(g => g.state === opt.state)
    if (group) {
      group.options.push(opt)
    }
  }

  // Filter groups based on selected status
  if (statusFilter.value !== 'all' && statusFilter.value in statusToState) {
    const targetState = statusToState[statusFilter.value]
    return groups.filter(g => g.state === targetState && g.options.length > 0)
  }

  return groups.filter(g => g.options.length > 0)
})

const statusOptions = [
  { value: 'all', label: 'All Statuses', icon: CircleDot },
  { value: 'active', label: 'Active', icon: AlertCircle },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
]

const priorityOptions = [
  { value: 'all', label: 'All Priorities', icon: Flag },
  { value: 'critical', label: 'P1 - Critical', icon: AlertOctagon },
  { value: 'urgent', label: 'P2 - Urgent', icon: AlertTriangle },
  { value: 'important', label: 'P3 - Important', icon: AlertCircle },
  { value: 'minor', label: 'P4 - Minor', icon: Circle },
]

const slaOptions = [
  { value: 'all', label: 'All SLA', icon: Timer },
  { value: 'success', label: 'SLA OK', icon: CheckCircle },
  { value: 'warning', label: 'SLA Warning', icon: AlertTriangle },
  { value: 'error', label: 'SLA Breached', icon: XCircle },
]

// Show SLA filter only when "In Progress" status reason is selected (statuscode 1)
const showSLAFilter = computed(() => {
  return statusReasonFilter.value === '1'
})

// Reset SLA filter when status reason changes away from "In Progress"
watch(statusReasonFilter, (newValue) => {
  if (newValue !== '1') {
    slaFilter.value = 'all'
  }
})

// Filter cases by SLA status (client-side filter)
const filteredCases = computed(() => {
  const cases = props.cases
  const filter = slaFilter.value

  if (filter === 'all') {
    return cases
  }

  return cases.filter(c => {
    const slaStatus = getSLABadgeStatus(c.sla, c.statusCode)
    return slaStatus === filter
  })
})

// Debounced search function
const debouncedSearch = useDebounceFn(() => {
  emitFilterChange()
}, 400)

// Watch search input with debounce
watch(searchQuery, () => {
  debouncedSearch()
})

// Watch dropdowns for immediate filter application
// immediate: true ensures initial filters are synced to parent on mount
watch([statusFilter, statusReasonFilter, priorityFilter, dxPendingReleaseFilter], () => {
  emitFilterChange()
}, { immediate: true })

// Reset status reason filter when status changes (if current selection is incompatible)
watch(statusFilter, (newStatus) => {
  if (newStatus === 'all') return // Keep current selection when showing all

  if (statusReasonFilter.value !== 'all') {
    const currentReasonState = props.statusReasonOptions.find(
      opt => String(opt.value) === statusReasonFilter.value
    )?.state

    // If current reason doesn't match new status, reset to 'all'
    if (currentReasonState !== undefined && currentReasonState !== statusToState[newStatus]) {
      statusReasonFilter.value = 'all'
    }
  }
})

function emitFilterChange() {
  emit('filterChange', {
    search: searchQuery.value,
    status: statusFilter.value,
    statusReason: statusReasonFilter.value,
    priority: priorityFilter.value,
    dxPendingRelease: dxPendingReleaseFilter.value,
    orderBy: sortColumn.value,
    orderDirection: sortDirection.value,
  })
}

function handleSortChange(column: string, direction: 'asc' | 'desc') {
  sortColumn.value = column
  sortDirection.value = direction
  emitFilterChange()
}

function handleClearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  statusReasonFilter.value = 'all'
  priorityFilter.value = 'all'
  dxPendingReleaseFilter.value = false
  slaFilter.value = 'all'
  sortColumn.value = props.initialSortColumn
  sortDirection.value = props.initialSortDirection
  emitFilterChange()
}

function handleRefresh() {
  emit('refresh', {
    search: searchQuery.value,
    status: statusFilter.value,
    statusReason: statusReasonFilter.value,
    priority: priorityFilter.value,
    dxPendingRelease: dxPendingReleaseFilter.value,
    orderBy: sortColumn.value,
    orderDirection: sortDirection.value,
  })
}

function handlePrevious() {
  emit('previous')
}

function handleNext() {
  emit('next')
}

function handlePageSizeChange(size: number) {
  emit('pageSizeChange', size)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <!-- Search -->
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          id="search"
          v-model="searchQuery"
          placeholder="Search cases..."
          class="pl-9 h-9 bg-background"
        />
      </div>

      <!-- Filter Pills -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Status Filter -->
        <UiSelect v-model="statusFilter">
          <UiSelectTrigger class="h-9 w-auto min-w-[130px] bg-background">
            <UiSelectValue placeholder="Status" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              <span class="flex items-center gap-2">
                <component :is="option.icon" class="h-3.5 w-3.5" />
                {{ option.label }}
              </span>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <!-- Status Reason Filter -->
        <UiSelect v-if="statusReasonOptions.length > 0" v-model="statusReasonFilter">
          <UiSelectTrigger class="h-9 w-auto min-w-[160px] bg-background">
            <UiSelectValue placeholder="Status Reason" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="all">All Reasons</UiSelectItem>
            <UiSelectSeparator />
            <template v-for="(group, index) in groupedStatusReasons" :key="group.label">
              <UiSelectSeparator v-if="index > 0" />
              <UiSelectGroup>
                <UiSelectLabel class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {{ group.label }}
                </UiSelectLabel>
                <UiSelectItem
                  v-for="opt in group.options"
                  :key="opt.value"
                  :value="String(opt.value)"
                >
                  {{ opt.label }}
                </UiSelectItem>
              </UiSelectGroup>
            </template>
          </UiSelectContent>
        </UiSelect>

        <!-- Priority Filter -->
        <UiSelect v-model="priorityFilter">
          <UiSelectTrigger class="h-9 w-auto min-w-[130px] bg-background">
            <UiSelectValue placeholder="Priority" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem
              v-for="option in priorityOptions"
              :key="option.value"
              :value="option.value"
            >
              <span class="flex items-center gap-2">
                <component :is="option.icon" class="h-3.5 w-3.5" />
                {{ option.label }}
              </span>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <!-- DX Pending Release Filter -->
        <label class="flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            v-model="dxPendingReleaseFilter"
            type="checkbox"
            class="h-4 w-4 rounded border-input accent-primary"
          />
          <span class="flex items-center gap-1.5 text-sm">
            <Inbox class="h-3.5 w-3.5 text-muted-foreground" />
            DX Pending Release
          </span>
        </label>

        <!-- SLA Filter - only shown when "In Progress" status reason is selected -->
        <UiSelect v-if="showSLAFilter" v-model="slaFilter">
          <UiSelectTrigger class="h-9 w-auto min-w-[120px] bg-background">
            <UiSelectValue placeholder="SLA" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem
              v-for="option in slaOptions"
              :key="option.value"
              :value="option.value"
            >
              <span class="flex items-center gap-2">
                <component :is="option.icon" class="h-3.5 w-3.5" />
                {{ option.label }}
              </span>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <!-- Divider -->
        <div class="hidden sm:block h-6 w-px bg-border" />

        <!-- Refresh Button -->
        <UiButton
          variant="ghost"
          size="sm"
          class="h-9 px-3"
          :disabled="isRefreshing"
          haptic-intent="none"
          @click="handleRefresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isRefreshing }" />
        </UiButton>

        <!-- Clear Button -->
        <UiButton variant="ghost" size="sm" class="h-9 text-muted-foreground" haptic-intent="none" @click="handleClearFilters">
          <X class="mr-1.5 h-3.5 w-3.5" />
          Clear
        </UiButton>
      </div>
    </div>

    <!-- Loading state (skeleton only for initial load, not refresh) -->
    <UiCard v-if="showSkeleton">
      <UiCardContent class="pt-6">
        <div class="space-y-4">
          <UiSkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Cases table -->
    <UiCard v-else class="overflow-hidden">
      <UiCardContent class="p-0 overflow-x-auto">
        <CasesTable
          :cases="filteredCases"
          :base-path="basePath"
          :sortable="true"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          :empty-title="emptyTitle"
          :empty-description="emptyDescription"
          @sort-change="handleSortChange"
        />

        <!-- Pagination -->
        <CasesPagination
          v-if="filteredCases.length > 0"
          :cases-count="filteredCases.length"
          :has-more="hasMore"
          :can-go-back="canGoBack"
          :page-size="props.pageSize"
          @previous="handlePrevious"
          @next="handleNext"
          @page-size-change="handlePageSizeChange"
        />
      </UiCardContent>
    </UiCard>
  </div>
</template>
