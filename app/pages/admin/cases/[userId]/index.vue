<script setup lang="ts">
import { ArrowLeft, Users, ArrowLeftCircle } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const userId = computed(() => route.params.userId as string)

// Track current filters for refresh/pagination
const currentFilters = ref({ search: '', status: 'active', priority: 'all' })

const {
  users,
  cases,
  hasMore,
  loading: isLoading,
  canGoBack,
  resetPagination,
  fetchUsersWithDynamics,
  fetchUserCases,
  fetchNextPage,
  fetchPreviousPage,
} = useAdminCases()

// Get selected user info
const selectedUser = computed(() => {
  return users.value.find(u => u._id === userId.value)
})

function getUserDisplayName(user: typeof selectedUser.value): string {
  if (!user) return 'Unknown User'
  if (user.name) return `${user.name} (${user.username})`
  if (user.email) return `${user.username} (${user.email})`
  return user.username
}

function getCurrentFilters(filters: { search: string; status: string; priority: string }) {
  return {
    status: filters.status === 'all' ? undefined : filters.status,
    priority: filters.priority === 'all' ? undefined : filters.priority,
    search: filters.search || undefined,
  }
}

async function loadCases(filters: { search: string; status: string; priority: string }) {
  if (!userId.value) return
  
  currentFilters.value = filters
  await fetchUserCases(userId.value, {
    ...getCurrentFilters(filters),
  })
}

// Load data on mount
onMounted(async () => {
  await fetchUsersWithDynamics()
  await loadCases({ search: '', status: 'active', priority: 'all' })
})

function handleFilterChange(filters: { search: string; status: string; priority: string }) {
  resetPagination()
  loadCases(filters)
}

function handleRefresh(filters: { search: string; status: string; priority: string }) {
  loadCases(filters)
}

async function goToNextPage() {
  if (!userId.value) return
  await fetchNextPage(userId.value, getCurrentFilters(currentFilters.value))
}

async function goToPreviousPage() {
  if (!userId.value) return
  await fetchPreviousPage(userId.value, getCurrentFilters(currentFilters.value))
}

function goBack() {
  router.push('/admin/cases')
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

    <!-- Cases List -->
    <CasesList
      :cases="cases"
      :is-loading="isLoading"
      :has-more="hasMore"
      :can-go-back="canGoBack"
      :base-path="`/admin/cases/${userId}`"
      initial-status="active"
      empty-title="No cases found for this user"
      @filter-change="handleFilterChange"
      @refresh="handleRefresh"
      @previous="goToPreviousPage"
      @next="goToNextPage"
    />
  </div>
</template>
