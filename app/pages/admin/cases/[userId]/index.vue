<script setup lang="ts">
import { Search, Filter, RefreshCw, ArrowLeft, Users, ArrowLeftCircle, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, Hash, FileText, CircleDot, Flag, Calendar, Clock, ChevronLeft, ChevronRight, FolderOpen, X } from 'lucide-vue-next'
import { formatTimeAgo } from '~/utils/timeAgo'

const router = useRouter()
const route = useRoute()

const userId = computed(() => route.params.userId as string)

const {
  users,
  cases,
  hasMore,
  pageSize,
  loading: isLoading,
  canGoBack,
  resetPagination,
  fetchUsersWithDynamics,
  fetchUserCases,
  fetchNextPage,
  fetchPreviousPage,
} = useAdminCases()

// Filters
const searchQuery = ref('')
const statusFilter = ref('all')
const priorityFilter = ref('all')

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

// Get selected user info
const selectedUser = computed(() => {
  return users.value.find(u => u._id === userId.value)
})

function getCurrentFilters() {
  return {
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    priority: priorityFilter.value === 'all' ? undefined : priorityFilter.value,
    search: searchQuery.value || undefined,
  }
}

async function loadCases() {
  if (!userId.value) return
  
  await fetchUserCases(userId.value, {
    pageSize: pageSize.value,
    ...getCurrentFilters(),
  })
}

// Load data on mount
onMounted(async () => {
  await fetchUsersWithDynamics()
  await loadCases()
})

function applyFilters() {
  resetPagination()
  loadCases()
}

function handleClearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  priorityFilter.value = 'all'
  resetPagination()
  loadCases()
}

async function goToNextPage() {
  if (!userId.value) return
  await fetchNextPage(userId.value, getCurrentFilters())
}

async function goToPreviousPage() {
  if (!userId.value) return
  await fetchPreviousPage(userId.value, getCurrentFilters())
}

function goBack() {
  router.push('/admin/cases')
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

function getUserDisplayName(user: typeof selectedUser.value): string {
  if (!user) return 'Unknown User'
  if (user.name) return `${user.name} (${user.username})`
  if (user.email) return `${user.username} (${user.email})`
  return user.username
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
      </UiButton>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">User Cases</h1>
        <p class="text-muted-foreground">
          Viewing cases for {{ getUserDisplayName(selectedUser) }}
        </p>
      </div>
      <div class="flex-1" />
      <UiButton variant="outline" @click="loadCases">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        Refresh
      </UiButton>
    </div>

    <!-- User Selection Card -->
    <UiCard>
      <UiCardHeader class="pb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="rounded-full bg-primary/10 p-3">
              <Users class="h-6 w-6 text-primary" />
            </div>
            <div>
              <UiCardTitle>{{ getUserDisplayName(selectedUser) }}</UiCardTitle>
              <UiCardDescription v-if="selectedUser?.email">
                {{ selectedUser.email }}
              </UiCardDescription>
            </div>
          </div>
          <UiButton variant="outline" @click="goBack">
            <ArrowLeftCircle class="mr-2 h-4 w-4" />
            Select Different User
          </UiButton>
        </div>
      </UiCardHeader>
    </UiCard>

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
                  <span class="flex items-center gap-2">
                    <component :is="option.icon" class="h-3.5 w-3.5" />
                    {{ option.label }}
                  </span>
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
                  <span class="flex items-center gap-2">
                    <component :is="option.icon" class="h-3.5 w-3.5" />
                    {{ option.label }}
                  </span>
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
              <X class="mr-2 h-4 w-4" />
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
              <UiTableHead><span class="flex items-center gap-1.5"><Hash class="h-3.5 w-3.5 text-muted-foreground" />Ticket #</span></UiTableHead>
              <UiTableHead><span class="flex items-center gap-1.5"><FileText class="h-3.5 w-3.5 text-muted-foreground" />Title</span></UiTableHead>
              <UiTableHead><span class="flex items-center gap-1.5"><CircleDot class="h-3.5 w-3.5 text-muted-foreground" />Status</span></UiTableHead>
              <UiTableHead><span class="flex items-center gap-1.5"><Flag class="h-3.5 w-3.5 text-muted-foreground" />Priority</span></UiTableHead>
              <UiTableHead><span class="flex items-center gap-1.5"><Calendar class="h-3.5 w-3.5 text-muted-foreground" />Created</span></UiTableHead>
              <UiTableHead><span class="flex items-center gap-1.5"><Clock class="h-3.5 w-3.5 text-muted-foreground" />Modified</span></UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="c in cases" :key="c.incidentid">
              <UiTableCell class="font-medium">
                <NuxtLink 
                  :to="`/admin/cases/${userId}/${c.incidentid}`" 
                  class="hover:underline text-primary"
                >
                  {{ c.ticketnumber }}
                </NuxtLink>
              </UiTableCell>
              <UiTableCell class="max-w-[300px] truncate">{{ c.title }}</UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getStatusVariant(c.statecode)" class="gap-1">
                  <component :is="getStatusIcon(c.statecode)" class="h-3 w-3" />
                  {{ getStatusLabel(c.statecode) }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getPriorityVariant(c.prioritycode)" class="gap-1">
                  <component :is="getPriorityIcon(c.prioritycode)" class="h-3 w-3" />
                  {{ getPriorityLabel(c.prioritycode) }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell :title="formatDate(c.createdon).tooltip">{{ formatDate(c.createdon).text }}</UiTableCell>
              <UiTableCell :title="formatDate(c.modifiedon).tooltip">{{ formatDate(c.modifiedon).text }}</UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>

        <div v-else class="text-center py-12 text-muted-foreground">
          <FolderOpen class="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No cases found for this user</p>
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
              @click="goToPreviousPage"
            >
              <ChevronLeft class="mr-1 h-4 w-4" />
              Previous
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="!hasMore"
              @click="goToNextPage"
            >
              Next
              <ChevronRight class="ml-1 h-4 w-4" />
            </UiButton>
          </div>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>
