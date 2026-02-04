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
  caseSLAData,
  hasMore,
  isLoading,
  isRefreshing,
  canGoBack,
  pageSize,
  statusReasonOptions,
  fetchCases,
  forceRefresh,
  fetchNextPage,
  fetchPreviousPage,
  fetchStatusReasonOptions,
  setFilters,
  clearFilters,
  setPageSize,
} = useCases()

// Fetch filter options when connected
watch(connectionStatus, (status) => {
  if (status?.connected) {
    fetchStatusReasonOptions()
  }
}, { immediate: true })

function handleFilterChange(filters: { search: string; status: string; statusReason: string; priority: string; dxPendingRelease: boolean; orderBy?: string; orderDirection?: 'asc' | 'desc' }) {
  setFilters({
    search: filters.search,
    status: (filters.status === 'all' ? '' : filters.status) as '' | 'active' | 'resolved' | 'cancelled',
    statusReason: filters.statusReason === 'all' ? '' : filters.statusReason,
    priority: (filters.priority === 'all' ? '' : filters.priority) as '' | 'high' | 'normal' | 'low',
    dxPendingRelease: filters.dxPendingRelease,
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

// CasesList's immediate watch handles initial fetch with correct filters
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

    <!-- Loading state while checking connection -->
    <template v-if="connectionStatus === null">
      <UiCard>
        <UiCardContent class="pt-6 space-y-4">
          <UiSkeleton class="h-10 w-full" />
          <UiSkeleton class="h-10 w-full" />
          <UiSkeleton class="h-64 w-full" />
        </UiCardContent>
      </UiCard>
    </template>

    <!-- Not connected state -->
    <UiCard v-else-if="connectionStatus?.connected === false" class="border-dashed">
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
        :case-sla-data="caseSLAData"
        :is-loading="isLoading"
        :is-refreshing="isRefreshing"
        :has-more="hasMore"
        :can-go-back="canGoBack"
        :page-size="pageSize"
        :status-reason-options="statusReasonOptions"
        base-path="/cases"
        initial-status="active"
        empty-title="No cases found"
        empty-description="Try adjusting your filters"
        @filter-change="handleFilterChange"
        @refresh="forceRefresh"
        @previous="fetchPreviousPage"
        @next="fetchNextPage"
        @page-size-change="setPageSize"
      />
    </template>
  </div>
</template>
