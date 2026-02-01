<script setup lang="ts">
import { Search, Filter, RefreshCw, Link2 } from 'lucide-vue-next'
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
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
]

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]



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

function formatDate(dateString: string | null | undefined) {
  return formatTimeAgo(dateString)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Cases</h1>
        <p class="text-muted-foreground">
          View and manage your Dynamics CRM cases
        </p>
      </div>
      <UiButton v-if="connectionStatus?.connected" variant="outline" @click="fetchCases()">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
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
        <NuxtLink to="/settings/dynamics">
          <UiButton>
            <Link2 class="mr-2 h-4 w-4" />
            Connect Now
          </UiButton>
        </NuxtLink>
      </UiCardContent>
    </UiCard>

    <template v-else>
      <!-- Filters -->
      <UiCard>
        <UiCardContent class="pt-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-end">
            <div class="flex-1">
              <UiLabel for="search">Search</UiLabel>
              <div class="relative">
                <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <UiInput
                  id="search"
                  v-model="searchQuery"
                  placeholder="Search by title or ticket number..."
                  class="pl-9"
                  @keyup.enter="applyFilters"
                />
              </div>
            </div>
            <div class="w-full md:w-40">
              <UiLabel for="status">Status</UiLabel>
              <UiSelect v-model="statusFilter">
                <UiSelectTrigger id="status">
                  <UiSelectValue placeholder="All Statuses" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem
                    v-for="option in statusOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="w-full md:w-40">
              <UiLabel for="priority">Priority</UiLabel>
              <UiSelect v-model="priorityFilter">
                <UiSelectTrigger id="priority">
                  <UiSelectValue placeholder="All Priorities" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem
                    v-for="option in priorityOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="flex gap-2">
              <UiButton @click="applyFilters">
                <Filter class="mr-2 h-4 w-4" />
                Apply
              </UiButton>
              <UiButton variant="outline" @click="handleClearFilters">
                Clear
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Loading state -->
      <UiCard v-if="isLoading">
        <UiCardContent class="pt-6">
          <div class="space-y-4">
            <UiSkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Cases table -->
      <UiCard v-else>
        <UiCardContent class="pt-6">
          <UiTable v-if="cases.length > 0">
            <UiTableHeader>
              <UiTableRow>
                <UiTableHead>Ticket #</UiTableHead>
                <UiTableHead>Title</UiTableHead>
                <UiTableHead>Status</UiTableHead>
                <UiTableHead>Priority</UiTableHead>
                <UiTableHead>Created</UiTableHead>
                <UiTableHead>Modified</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              <UiTableRow v-for="c in cases" :key="c.incidentid">
                <UiTableCell class="font-medium">
                  <NuxtLink :to="`/cases/${c.incidentid}`" class="hover:underline text-primary">
                    {{ c.ticketnumber }}
                  </NuxtLink>
                </UiTableCell>
                <UiTableCell class="max-w-[300px] truncate">{{ c.title }}</UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getStatusVariant(c.statecode)">
                    {{ getStatusLabel(c.statecode) }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getPriorityVariant(c.prioritycode)">
                    {{ getPriorityLabel(c.prioritycode) }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell :title="formatDate(c.createdon).tooltip">{{ formatDate(c.createdon).text }}</UiTableCell>
                <UiTableCell :title="formatDate(c.modifiedon).tooltip">{{ formatDate(c.modifiedon).text }}</UiTableCell>
              </UiTableRow>
            </UiTableBody>
          </UiTable>

          <div v-else class="text-center py-12 text-muted-foreground">
            No cases found
          </div>

          <!-- Pagination -->
          <div v-if="canGoBack() || hasMore" class="flex items-center justify-between mt-4 pt-4 border-t">
            <p class="text-sm text-muted-foreground">
              Showing {{ cases.length }} cases per page
            </p>
            <div class="flex gap-2">
              <UiButton
                variant="outline"
                size="sm"
                :disabled="!canGoBack()"
                @click="fetchPreviousPage()"
              >
                Previous
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="!hasMore"
                @click="fetchNextPage()"
              >
                Next
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
