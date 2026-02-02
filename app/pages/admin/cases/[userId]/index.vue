<script setup lang="ts">
import { Search, RefreshCw, ArrowLeft, Users, ArrowLeftCircle, AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, CircleDot, Flag, FolderOpen, X } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { formatCaseDate } from '~/utils/caseHelpers'

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
          <UiButton variant="outline" @click="handleClearFilters">
            <X class="mr-2 h-4 w-4" />
            Clear
          </UiButton>
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
    <UiCard v-else class="overflow-hidden">
      <UiCardContent class="p-0 overflow-x-auto">
        <CasesTable
          :cases="cases"
          :base-path="`/admin/cases/${userId}`"
          empty-title="No cases found for this user"
        />

        <!-- Pagination -->
        <CasesPagination
          v-if="cases.length > 0"
          :cases-count="cases.length"
          :has-more="hasMore"
          :can-go-back="canGoBack"
          @previous="goToPreviousPage"
          @next="goToNextPage"
        />
      </UiCardContent>
    </UiCard>
  </div>
</template>
