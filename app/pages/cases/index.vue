<script setup lang="ts">
import { Link2, FolderOpen } from 'lucide-vue-next'

const { isAdmin } = useAuth()
const router = useRouter()
const CASES_SCROLL_STORAGE_KEY = 'cases:list:scroll-y'
const pendingScrollRestoreY = ref<number | null>(null)
let restoreScrollTimer: ReturnType<typeof setTimeout> | null = null

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

function clearRestoreScrollTimer() {
  if (!restoreScrollTimer) return
  clearTimeout(restoreScrollTimer)
  restoreScrollTimer = null
}

function saveCasesScrollPosition() {
  sessionStorage.setItem(CASES_SCROLL_STORAGE_KEY, String(window.scrollY))
}

function scheduleScrollRestore(attempt = 0) {
  if (pendingScrollRestoreY.value === null) return

  nextTick(() => {
    requestAnimationFrame(() => {
      const targetY = pendingScrollRestoreY.value
      if (targetY === null) return

      window.scrollTo({ top: targetY, behavior: 'auto' })

      const maxScrollY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
      const canReachTarget = maxScrollY + 4 >= targetY
      const restored = canReachTarget && Math.abs(window.scrollY - targetY) < 4

      if (restored || attempt >= 12) {
        pendingScrollRestoreY.value = null
        sessionStorage.removeItem(CASES_SCROLL_STORAGE_KEY)
        clearRestoreScrollTimer()
        return
      }

      clearRestoreScrollTimer()
      restoreScrollTimer = setTimeout(() => {
        scheduleScrollRestore(attempt + 1)
      }, 80)
    })
  })
}

function prepareScrollRestore() {
  if (process.server) return

  const savedValue = Number(sessionStorage.getItem(CASES_SCROLL_STORAGE_KEY))
  if (!Number.isFinite(savedValue) || savedValue < 0) {
    sessionStorage.removeItem(CASES_SCROLL_STORAGE_KEY)
    return
  }

  pendingScrollRestoreY.value = savedValue
  scheduleScrollRestore()
}

// Fetch filter options when connected
watch(connectionStatus, (status) => {
  if (status?.connected) {
    fetchStatusReasonOptions()
  }
}, { immediate: true })

watch(
  () => [isLoading.value, cases.value.length] as const,
  ([loading]) => {
    if (!loading && pendingScrollRestoreY.value !== null) {
      scheduleScrollRestore()
    }
  }
)

onMounted(() => {
  prepareScrollRestore()
})

onBeforeRouteLeave((to) => {
  clearRestoreScrollTimer()

  if (to.path.startsWith('/cases/')) {
    saveCasesScrollPosition()
    return
  }

  sessionStorage.removeItem(CASES_SCROLL_STORAGE_KEY)
  pendingScrollRestoreY.value = null
})

onUnmounted(() => {
  clearRestoreScrollTimer()
})

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
