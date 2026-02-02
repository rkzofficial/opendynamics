<script setup lang="ts">
import { Search, RefreshCw, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, CircleDot, Flag, X } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import type { Case } from '~/types'

interface Props {
  cases: Case[]
  isLoading: boolean
  hasMore: boolean
  canGoBack: boolean
  basePath: string
  emptyTitle?: string
  emptyDescription?: string
  initialSearch?: string
  initialStatus?: string
  initialPriority?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: 'No cases found',
  emptyDescription: 'Try adjusting your filters',
  initialSearch: '',
  initialStatus: 'active',
  initialPriority: 'all',
})

const emit = defineEmits<{
  refresh: [filters: { search: string; status: string; priority: string }]
  previous: []
  next: []
  filterChange: [filters: { search: string; status: string; priority: string }]
}>()

const searchQuery = ref(props.initialSearch)
const statusFilter = ref(props.initialStatus)
const priorityFilter = ref(props.initialPriority)

const statusOptions = [
  { value: 'all', label: 'All Statuses', icon: CircleDot },
  { value: 'active', label: 'Active', icon: AlertCircle },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
]

const priorityOptions = [
  { value: 'all', label: 'All Priorities', icon: Flag },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'normal', label: 'Normal', icon: Minus },
  { value: 'low', label: 'Low', icon: ArrowDown },
]

// Debounced search function
const debouncedSearch = useDebounceFn(() => {
  emitFilterChange()
}, 400)

// Watch search input with debounce
watch(searchQuery, () => {
  debouncedSearch()
})

// Watch dropdowns for immediate filter application
watch([statusFilter, priorityFilter], () => {
  emitFilterChange()
})

function emitFilterChange() {
  emit('filterChange', {
    search: searchQuery.value,
    status: statusFilter.value,
    priority: priorityFilter.value,
  })
}

function handleClearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  priorityFilter.value = 'all'
  emitFilterChange()
}

function handleRefresh() {
  emit('refresh', {
    search: searchQuery.value,
    status: statusFilter.value,
    priority: priorityFilter.value,
  })
}

function handlePrevious() {
  emit('previous')
}

function handleNext() {
  emit('next')
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

        <!-- Divider -->
        <div class="hidden sm:block h-6 w-px bg-border" />

        <!-- Refresh Button -->
        <UiButton
          variant="ghost"
          size="sm"
          class="h-9 px-3"
          @click="handleRefresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
        </UiButton>

        <!-- Clear Button -->
        <UiButton variant="ghost" size="sm" class="h-9 text-muted-foreground" @click="handleClearFilters">
          <X class="mr-1.5 h-3.5 w-3.5" />
          Clear
        </UiButton>
      </div>
    </div>

    <!-- Loading state -->
    <UiCard v-if="isLoading">
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
          :cases="cases"
          :base-path="basePath"
          show-modified
          :empty-title="emptyTitle"
          :empty-description="emptyDescription"
        />

        <!-- Pagination -->
        <CasesPagination
          v-if="cases.length > 0"
          :cases-count="cases.length"
          :has-more="hasMore"
          :can-go-back="canGoBack"
          @previous="handlePrevious"
          @next="handleNext"
        />
      </UiCardContent>
    </UiCard>
  </div>
</template>
