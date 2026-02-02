<script setup lang="ts">
import { Search, RefreshCw, Link2, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, CircleDot, Flag, FolderOpen, X } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { 
  getStatusLabel, 
  getPriorityLabel,
  getStatusDotColor,
  getPriorityIcon,
  getPriorityIconColor,
  formatCaseDate 
} from '~/utils/caseHelpers'

const { isAdmin } = useAuth()
const router = useRouter()

// Redirect admins to admin cases page
onMounted(() => {
  if (isAdmin()) {
    router.push('/admin/cases')
  }
})

const { connectionStatus } = useDynamics()
const {
  cases,
  hasMore,
  pageSize,
  isLoading,
  filters,
  canGoBack,
  fetchCases,
  fetchNextPage,
  fetchPreviousPage,
  setFilters,
  clearFilters,
} = useCases()

const searchQuery = ref(filters.value.search || '')
const statusFilter = ref(filters.value.status || 'all')
const priorityFilter = ref(filters.value.priority || 'all')

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
  applyFilters()
}, 400)

// Watch search input with debounce
watch(searchQuery, () => {
  debouncedSearch()
})

// Watch dropdowns for immediate filter application
watch([statusFilter, priorityFilter], () => {
  applyFilters()
})

watch(
  () => connectionStatus.value?.connected,
  (connected) => {
    if (connected) {
      fetchCases()
    }
  },
  { immediate: true }
)

function applyFilters() {
  setFilters({
    search: searchQuery.value,
    status: (statusFilter.value === 'all' ? '' : statusFilter.value) as '' | 'active' | 'resolved' | 'cancelled',
    priority: (priorityFilter.value === 'all' ? '' : priorityFilter.value) as '' | 'high' | 'normal' | 'low',
    skipToken: undefined,
  })
  fetchCases()
}

function handleClearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  priorityFilter.value = 'all'
  clearFilters()
  fetchCases()
}




</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FolderOpen class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 class="text-xl font-semibold tracking-tight">Cases</h1>
          <p class="text-sm text-muted-foreground">
            View and manage your support cases
          </p>
        </div>
      </div>
      <UiButton
        v-if="connectionStatus?.connected"
        variant="ghost"
        size="sm"
        class="h-8 px-3"
        @click="fetchCases()"
      >
        <RefreshCw class="mr-1.5 h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
        Refresh
      </UiButton>
    </div>

    <!-- Not connected state -->
    <UiCard v-if="!connectionStatus?.connected" class="border-dashed">
      <UiCardContent class="flex flex-col items-center justify-center py-12 text-center">
        <div class="rounded-full bg-muted p-3 mb-4">
          <Link2 class="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Connect to Dynamics CRM</h3>
        <p class="text-muted-foreground mb-4 max-w-md">
          Connect your Microsoft account to view and manage cases.
        </p>
        <NuxtLink to="/settings">
          <UiButton>
            <Link2 class="mr-2 h-4 w-4" />
            Connect Now
          </UiButton>
        </NuxtLink>
      </UiCardContent>
    </UiCard>

    <template v-else>
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
              <div class="flex items-center gap-2">
                <CircleDot class="h-3.5 w-3.5 text-muted-foreground" />
                <UiSelectValue placeholder="Status" />
              </div>
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
              <div class="flex items-center gap-2">
                <Flag class="h-3.5 w-3.5 text-muted-foreground" />
                <UiSelectValue placeholder="Priority" />
              </div>
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
            base-path="/cases"
            show-modified
            empty-title="No cases found"
            empty-description="Try adjusting your filters"
          />

          <!-- Pagination -->
          <CasesPagination
            v-if="cases.length > 0"
            :cases-count="cases.length"
            :has-more="hasMore"
            :can-go-back="canGoBack"
            @previous="fetchPreviousPage"
            @next="fetchNextPage"
          />
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
