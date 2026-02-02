<script setup lang="ts">
import { Link2, FolderOpen } from 'lucide-vue-next'

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
  isLoading,
  canGoBack,
  fetchCases,
  fetchNextPage,
  fetchPreviousPage,
  setFilters,
  clearFilters,
} = useCases()

function handleFilterChange(filters: { search: string; status: string; priority: string; orderBy?: string; orderDirection?: 'asc' | 'desc' }) {
  setFilters({
    search: filters.search,
    status: (filters.status === 'all' ? '' : filters.status) as '' | 'active' | 'resolved' | 'cancelled',
    priority: (filters.priority === 'all' ? '' : filters.priority) as '' | 'high' | 'normal' | 'low',
    orderBy: filters.orderBy,
    orderDirection: filters.orderDirection,
    skipToken: undefined,
  })
  fetchCases()
}

function handleClear() {
  clearFilters()
  fetchCases()
}

watch(
  () => connectionStatus.value?.connected,
  (connected) => {
    if (connected) {
      setFilters({ orderBy: 'modifiedon', orderDirection: 'desc' })
      fetchCases()
    }
  },
  { immediate: true }
)
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
      <CasesList
        :cases="cases"
        :is-loading="isLoading"
        :has-more="hasMore"
        :can-go-back="canGoBack"
        base-path="/cases"
        initial-status="active"
        empty-title="No cases found"
        empty-description="Try adjusting your filters"
        @filter-change="handleFilterChange"
        @refresh="fetchCases"
        @previous="fetchPreviousPage"
        @next="fetchNextPage"
      />
    </template>
  </div>
</template>
