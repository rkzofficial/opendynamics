<script setup lang="ts">
import { Search, RefreshCw, Link2, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, Hash, FileText, CircleDot, Flag, Calendar, Clock, ChevronLeft, ChevronRight, FolderOpen, X } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { formatTimeAgo } from '~/utils/timeAgo'

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



function getStatusLabel(statecode: number) {
  switch (statecode) {
    case 0: return 'Active'
    case 1: return 'Resolved'
    case 2: return 'Cancelled'
    default: return 'Unknown'
  }
}

function getStatusVariant(statecode: number): 'default' | 'success' | 'secondary' {
  switch (statecode) {
    case 0: return 'default'
    case 1: return 'success'
    case 2: return 'secondary'
    default: return 'secondary'
  }
}

function getPriorityLabel(prioritycode: number) {
  switch (prioritycode) {
    case 1: return 'High'
    case 2: return 'Normal'
    case 3: return 'Low'
    default: return 'Unknown'
  }
}

function getPriorityVariant(prioritycode: number): 'destructive' | 'warning' | 'secondary' {
  switch (prioritycode) {
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    default: return 'secondary'
  }
}

function getStatusIcon(statecode: number) {
  switch (statecode) {
    case 0: return AlertCircle
    case 1: return CheckCircle
    case 2: return XCircle
    default: return AlertCircle
  }
}

function getPriorityIcon(prioritycode: number) {
  switch (prioritycode) {
    case 1: return ArrowUp
    case 2: return Minus
    case 3: return ArrowDown
    default: return Minus
  }
}

function formatDate(dateString: string | null | undefined) {
  return formatTimeAgo(dateString)
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
          <div v-if="cases.length > 0">
            <table class="w-full min-w-[880px] table-fixed">
              <thead>
                <tr class="border-b bg-muted/50">
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[110px]">
                    <span class="flex items-center gap-1.5">
                      <Hash class="h-3.5 w-3.5" />
                      Ticket
                    </span>
                  </th>
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                    <span class="flex items-center gap-1.5">
                      <FileText class="h-3.5 w-3.5" />
                      Title
                    </span>
                  </th>
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">
                    <span class="flex items-center gap-1.5">
                      <CircleDot class="h-3.5 w-3.5" />
                      Status
                    </span>
                  </th>
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">
                    <span class="flex items-center gap-1.5">
                      <Flag class="h-3.5 w-3.5" />
                      Priority
                    </span>
                  </th>
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[160px]">
                    <span class="flex items-center gap-1.5">
                      <Calendar class="h-3.5 w-3.5" />
                      Created
                    </span>
                  </th>
                  <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[160px]">
                    <span class="flex items-center gap-1.5">
                      <Clock class="h-3.5 w-3.5" />
                      Modified
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr
                  v-for="c in cases"
                  :key="c.incidentid"
                  class="group transition-colors hover:bg-muted/50 cursor-pointer"
                  @click="router.push(`/cases/${c.incidentid}`)"
                >
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
                    <div class="flex items-center gap-1.5">
                      <span
                        :class="[
                          'h-2 w-2 rounded-full flex-shrink-0',
                          c.statecode === 0 ? 'bg-blue-500' :
                          c.statecode === 1 ? 'bg-green-500' :
                          c.statecode === 2 ? 'bg-gray-400' : 'bg-gray-400'
                        ]"
                      />
                      <span class="text-sm">{{ getStatusLabel(c.statecode) }}</span>
                    </div>
                  </td>
                  <td class="h-14 px-3 align-middle">
                    <div class="flex items-center gap-1.5">
                      <component
                        :is="getPriorityIcon(c.prioritycode)"
                        :class="[
                          'h-4 w-4 flex-shrink-0',
                          c.prioritycode === 1 ? 'text-red-500' :
                          c.prioritycode === 2 ? 'text-amber-500' :
                          c.prioritycode === 3 ? 'text-gray-400' : 'text-gray-400'
                        ]"
                      />
                      <span class="text-sm">{{ getPriorityLabel(c.prioritycode) }}</span>
                    </div>
                  </td>
                  <td class="h-14 px-3 align-middle">
                    <span :title="formatDate(c.createdon).tooltip" class="text-sm text-muted-foreground">
                      {{ formatDate(c.createdon).text }}
                    </span>
                  </td>
                  <td class="h-14 px-3 align-middle">
                    <span :title="formatDate(c.modifiedon).tooltip" class="text-sm text-muted-foreground">
                      {{ formatDate(c.modifiedon).text }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div class="rounded-full bg-muted p-4 mb-4">
              <FolderOpen class="h-8 w-8 opacity-50" />
            </div>
            <p class="font-medium">No cases found</p>
            <p class="text-sm mt-1">Try adjusting your filters</p>
          </div>

          <!-- Pagination -->
          <div v-if="cases.length > 0 && (canGoBack || hasMore)" class="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <p class="text-sm text-muted-foreground">
              Showing <span class="font-medium text-foreground">{{ cases.length }}</span> cases
            </p>
            <div class="flex gap-2">
              <UiButton
                variant="outline"
                size="sm"
                :disabled="!canGoBack"
                @click="fetchPreviousPage"
              >
                <ChevronLeft class="mr-1 h-4 w-4" />
                Previous
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="!hasMore"
                @click="fetchNextPage"
              >
                Next
                <ChevronRight class="ml-1 h-4 w-4" />
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
