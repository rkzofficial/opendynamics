<script setup lang="ts">
import { Search, RefreshCw, AlertCircle, AlertOctagon, AlertTriangle, CheckCircle, XCircle, Circle, CircleDot, Flag, X, Timer, Inbox, SlidersHorizontal } from 'lucide-vue-next'
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
const isMobileFilterSheetOpen = ref(false)
const MOBILE_FILTER_SHEET_QUERY = '(max-width: 639px)'
const MOBILE_FILTER_SHEET_CLOSE_THRESHOLD = 120
const MOBILE_FILTER_SHEET_CLOSE_DURATION_MS = 180
const isMobileFilterSheet = ref(false)
const isDraggingMobileFilterSheet = ref(false)
const mobileFilterSheetOffsetY = ref(0)
const mobileFilterSheetDragStartY = ref(0)
let mobileFilterSheetCloseTimer: ReturnType<typeof setTimeout> | null = null
let mobileFilterSheetMediaQuery: MediaQueryList | null = null
let removeMobileFilterSheetListener: (() => void) | null = null

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

type ActiveFilterKey = 'status' | 'statusReason' | 'priority' | 'dxPendingRelease' | 'sla'

const statusReasonLabelMap = computed(() => {
  return new Map(props.statusReasonOptions.map(option => [String(option.value), option.label]))
})

const activeFilterChips = computed(() => {
  const chips: Array<{ key: ActiveFilterKey; label: string }> = []

  if (statusFilter.value !== 'all') {
    const statusLabel = statusOptions.find(option => option.value === statusFilter.value)?.label ?? 'Status'
    chips.push({ key: 'status', label: statusLabel })
  }

  if (statusReasonFilter.value !== 'all') {
    chips.push({
      key: 'statusReason',
      label: statusReasonLabelMap.value.get(statusReasonFilter.value) ?? 'Status Reason',
    })
  }

  if (priorityFilter.value !== 'all') {
    const priorityLabel = priorityOptions.find(option => option.value === priorityFilter.value)?.label ?? 'Priority'
    chips.push({ key: 'priority', label: priorityLabel })
  }

  if (dxPendingReleaseFilter.value) {
    chips.push({ key: 'dxPendingRelease', label: 'DX Pending Release' })
  }

  if (showSLAFilter.value && slaFilter.value !== 'all') {
    const slaLabel = slaOptions.find(option => option.value === slaFilter.value)?.label ?? 'SLA'
    chips.push({ key: 'sla', label: slaLabel })
  }

  return chips
})

const activeFilterCount = computed(() => activeFilterChips.value.length)

const mobileFilterSheetStyle = computed(() => {
  if (!isMobileFilterSheet.value) return {}

  return {
    transform: `translateY(${mobileFilterSheetOffsetY.value}px)`,
    transition: isDraggingMobileFilterSheet.value
      ? 'none'
      : `transform ${MOBILE_FILTER_SHEET_CLOSE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    willChange: 'transform',
  }
})

const mobileFilterBackdropStyle = computed(() => {
  if (!isMobileFilterSheet.value) {
    return {
      transition: `opacity ${MOBILE_FILTER_SHEET_CLOSE_DURATION_MS}ms ease`,
    }
  }

  const progress = Math.min(
    mobileFilterSheetOffsetY.value / Math.max(MOBILE_FILTER_SHEET_CLOSE_THRESHOLD, 1),
    1
  )

  return {
    opacity: `${1 - progress}`,
    transition: isDraggingMobileFilterSheet.value
      ? 'none'
      : `opacity ${MOBILE_FILTER_SHEET_CLOSE_DURATION_MS}ms ease`,
  }
})

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

function handleClearFilter(key: ActiveFilterKey) {
  switch (key) {
    case 'status':
      statusFilter.value = 'all'
      break
    case 'statusReason':
      statusReasonFilter.value = 'all'
      break
    case 'priority':
      priorityFilter.value = 'all'
      break
    case 'dxPendingRelease':
      dxPendingReleaseFilter.value = false
      break
    case 'sla':
      slaFilter.value = 'all'
      break
  }
}

function clearMobileFilterSheetCloseTimer() {
  if (!mobileFilterSheetCloseTimer) return
  clearTimeout(mobileFilterSheetCloseTimer)
  mobileFilterSheetCloseTimer = null
}

function resetMobileFilterSheetPosition() {
  clearMobileFilterSheetCloseTimer()
  isDraggingMobileFilterSheet.value = false
  mobileFilterSheetOffsetY.value = 0
  mobileFilterSheetDragStartY.value = 0
}

function setIsMobileFilterSheet(matches: boolean) {
  isMobileFilterSheet.value = matches
  if (!matches) {
    resetMobileFilterSheetPosition()
  }
}

function addMobileFilterSheetListener() {
  if (!mobileFilterSheetMediaQuery) return

  const handler = (event: MediaQueryListEvent) => setIsMobileFilterSheet(event.matches)
  if (mobileFilterSheetMediaQuery.addEventListener) {
    mobileFilterSheetMediaQuery.addEventListener('change', handler)
  } else {
    mobileFilterSheetMediaQuery.addListener(handler)
  }

  return () => {
    if (mobileFilterSheetMediaQuery?.removeEventListener) {
      mobileFilterSheetMediaQuery.removeEventListener('change', handler)
    } else {
      mobileFilterSheetMediaQuery?.removeListener(handler)
    }
  }
}

function closeMobileFilterSheet() {
  isMobileFilterSheetOpen.value = false
  resetMobileFilterSheetPosition()
}

function handleMobileFilterSheetPointerDown(event: PointerEvent) {
  if (!isMobileFilterSheetOpen.value || !isMobileFilterSheet.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  clearMobileFilterSheetCloseTimer()
  isDraggingMobileFilterSheet.value = true
  mobileFilterSheetDragStartY.value = event.clientY
}

function handleWindowPointerMove(event: PointerEvent) {
  if (!isDraggingMobileFilterSheet.value || !isMobileFilterSheet.value) return

  const delta = Math.max(0, event.clientY - mobileFilterSheetDragStartY.value)
  mobileFilterSheetOffsetY.value = delta
}

function finishMobileFilterSheetDrag(forceClose = false) {
  if (!isDraggingMobileFilterSheet.value && !forceClose) return

  const shouldClose = forceClose || mobileFilterSheetOffsetY.value >= MOBILE_FILTER_SHEET_CLOSE_THRESHOLD
  isDraggingMobileFilterSheet.value = false

  if (!shouldClose) {
    mobileFilterSheetOffsetY.value = 0
    return
  }

  mobileFilterSheetOffsetY.value = window.innerHeight
  clearMobileFilterSheetCloseTimer()
  mobileFilterSheetCloseTimer = setTimeout(() => {
    closeMobileFilterSheet()
  }, MOBILE_FILTER_SHEET_CLOSE_DURATION_MS)
}

function handleWindowPointerUp() {
  finishMobileFilterSheetDrag()
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

watch(isMobileFilterSheetOpen, (isOpen) => {
  if (!isOpen) {
    resetMobileFilterSheetPosition()
  }
})

onMounted(() => {
  mobileFilterSheetMediaQuery = window.matchMedia(MOBILE_FILTER_SHEET_QUERY)
  removeMobileFilterSheetListener = addMobileFilterSheetListener()
  setIsMobileFilterSheet(mobileFilterSheetMediaQuery.matches)
  window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
  window.addEventListener('pointerup', handleWindowPointerUp)
  window.addEventListener('pointercancel', handleWindowPointerUp)
})

onUnmounted(() => {
  clearMobileFilterSheetCloseTimer()
  removeMobileFilterSheetListener?.()
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
  window.removeEventListener('pointercancel', handleWindowPointerUp)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Mobile filters -->
    <div class="space-y-3 sm:hidden">
      <!-- Search -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <UiInput
            id="search"
            v-model="searchQuery"
            placeholder="Search cases..."
            class="h-10 rounded-full border-border/70 bg-background pl-9 pr-4"
          />
        </div>

        <UiButton
          variant="outline"
          size="sm"
          class="h-10 shrink-0 rounded-full border-border/70 px-3"
          haptic-intent="none"
          @click="isMobileFilterSheetOpen = true"
        >
          <SlidersHorizontal class="mr-2 h-4 w-4" />
          Filters
          <span
            v-if="activeFilterCount > 0"
            class="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-secondary-foreground"
          >
            {{ activeFilterCount }}
          </span>
        </UiButton>
      </div>

      <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2">
        <UiButton
          v-for="chip in activeFilterChips"
          :key="chip.key"
          variant="outline"
          size="sm"
          class="h-8 rounded-full border-border/70 bg-background px-3 text-xs font-medium"
          haptic-intent="none"
          @click="handleClearFilter(chip.key)"
        >
          {{ chip.label }}
          <X class="ml-1.5 h-3 w-3 text-muted-foreground" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          class="h-8 rounded-full px-2 text-xs text-muted-foreground"
          haptic-intent="none"
          @click="handleClearFilters"
        >
          Clear all
        </UiButton>
      </div>
    </div>

    <!-- Desktop filters -->
    <div class="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center">
      <!-- Search -->
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <UiInput
          id="search"
          v-model="searchQuery"
          placeholder="Search cases..."
          class="h-9 bg-background pl-9"
        />
      </div>

      <!-- Filter Pills -->
      <div class="flex flex-wrap items-center gap-2">
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

    <UiDialog
      :open="isMobileFilterSheetOpen"
      container-class="items-end justify-center px-0 sm:items-center sm:px-4"
      class="mt-auto w-full max-w-none gap-0 rounded-t-[28px] border-border/80 bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl sm:hidden"
      :content-style="mobileFilterSheetStyle"
      :backdrop-style="mobileFilterBackdropStyle"
      :show-close-button="false"
      @update:open="isMobileFilterSheetOpen = $event"
    >
      <div
        class="-mx-4 mb-4 flex cursor-grab select-none justify-center border-b border-border/60 bg-background/95 px-4 pb-2 pt-2 [touch-action:none] active:cursor-grabbing"
        @pointerdown="handleMobileFilterSheetPointerDown"
      >
        <div class="h-1.5 w-12 rounded-full bg-muted" />
      </div>

      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <p class="text-base font-semibold tracking-tight">Filters</p>
          <p class="text-sm text-muted-foreground">
            Refine the case list without pushing the table off screen.
          </p>
        </div>

        <UiButton
          variant="ghost"
          size="icon"
          class="h-9 w-9 rounded-full"
          haptic-intent="none"
          @click="closeMobileFilterSheet"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Close filters</span>
        </UiButton>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium text-foreground">Status</p>
          <UiSelect v-model="statusFilter">
            <UiSelectTrigger class="h-11 w-full rounded-2xl border-border/70 bg-background">
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
        </div>

        <div v-if="statusReasonOptions.length > 0" class="space-y-2">
          <p class="text-sm font-medium text-foreground">Status Reason</p>
          <UiSelect v-model="statusReasonFilter">
            <UiSelectTrigger class="h-11 w-full rounded-2xl border-border/70 bg-background">
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
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-foreground">Priority</p>
          <UiSelect v-model="priorityFilter">
            <UiSelectTrigger class="h-11 w-full rounded-2xl border-border/70 bg-background">
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
        </div>

        <label class="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
          <div class="space-y-1">
            <span class="flex items-center gap-2 text-sm font-medium text-foreground">
              <Inbox class="h-4 w-4 text-muted-foreground" />
              DX Pending Release
            </span>
            <p class="text-xs text-muted-foreground">
              Limit results to cases waiting on a DX release.
            </p>
          </div>

          <input
            v-model="dxPendingReleaseFilter"
            type="checkbox"
            class="h-4 w-4 rounded border-input accent-primary"
          />
        </label>

        <div v-if="showSLAFilter" class="space-y-2">
          <p class="text-sm font-medium text-foreground">SLA</p>
          <UiSelect v-model="slaFilter">
            <UiSelectTrigger class="h-11 w-full rounded-2xl border-border/70 bg-background">
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
        </div>
      </div>

      <div class="mt-6 flex items-center gap-2">
        <UiButton
          variant="outline"
          size="icon"
          class="h-10 w-10 rounded-full border-border/70"
          :disabled="isRefreshing"
          haptic-intent="none"
          @click="handleRefresh"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
          <span class="sr-only">Refresh cases</span>
        </UiButton>

        <UiButton
          variant="outline"
          class="h-10 flex-1 rounded-full border-border/70"
          haptic-intent="none"
          @click="handleClearFilters"
        >
          Reset
        </UiButton>

        <UiButton
          class="h-10 flex-1 rounded-full"
          haptic-intent="none"
          @click="closeMobileFilterSheet"
        >
          Done
        </UiButton>
      </div>
    </UiDialog>

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
