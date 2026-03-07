<script setup lang="ts">
import { FolderOpen, CheckCircle, Clock, AlertTriangle, TrendingUp, Link2, Users, ArrowLeft, AlertCircle } from 'lucide-vue-next'
import type { DashboardStats, DashboardKPIs, Case } from '~/types'

const { connectionStatus } = useDynamics()
const { isAdmin } = useAuth()
const { users, loading: usersLoading, error: usersError, fetchUsersWithDynamics } = useAdminCases()

const stats = ref<DashboardStats | null>(null)
const kpis = ref<DashboardKPIs | null>(null)
const recentCases = ref<Case[]>([])
const isLoading = ref(true)
const error = ref('')

// Admin-specific state
const selectedUserId = ref<string | null>(null)
const selectedUser = computed(() => {
  if (!selectedUserId.value) return null
  return users.value.find(u => u._id === selectedUserId.value) || null
})

async function fetchDashboardData() {
  // For admins, require user selection first
  if (isAdmin()) {
    if (!selectedUserId.value) {
      isLoading.value = false
      return
    }
  } else {
    // For regular users, check connection status
    if (!connectionStatus.value?.connected) {
      isLoading.value = false
      return
    }
  }

  isLoading.value = true
  error.value = ''

  try {
    const params: Record<string, string> = {}
    if (isAdmin() && selectedUserId.value) {
      params.userId = selectedUserId.value
    }

    const [statsResponse, kpisResponse, casesResponse] = await Promise.all([
      $fetch<DashboardStats>('/api/kpi/dashboard', { params }),
      $fetch<DashboardKPIs>('/api/kpi/dashboard', { params: { ...params, type: 'kpis' } }),
      $fetch<{ cases: Case[] }>('/api/cases', {
        params: { ...params, pageSize: '10', orderBy: 'createdon', orderDirection: 'desc' },
      }),
    ])

    stats.value = statsResponse
    kpis.value = kpisResponse
    recentCases.value = casesResponse.cases
  } catch (e) {
    error.value = 'Failed to load dashboard data'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

// Watch for user selection changes (admin only)
watch(selectedUserId, () => {
  if (isAdmin() && selectedUserId.value) {
    fetchDashboardData()
  }
})

// Watch connection status for regular users
watch(
  () => connectionStatus.value?.connected,
  (connected) => {
    if (!isAdmin() && connected) {
      fetchDashboardData()
    }
  },
  { immediate: true }
)

// Fetch users list for admin on mount
onMounted(() => {
  if (isAdmin()) {
    fetchUsersWithDynamics()
  }
})

function clearUserSelection() {
  selectedUserId.value = null
  stats.value = null
  kpis.value = null
  recentCases.value = []
}

const statCards = computed(() => [
  {
    title: 'Total Cases',
    value: stats.value?.totalCases ?? '-',
    icon: FolderOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    title: 'Open Cases',
    value: stats.value?.openCases ?? '-',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    title: 'Resolved Today',
    value: stats.value?.resolvedToday ?? '-',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    title: 'Avg First Response',
    value: stats.value?.avgFirstResponseTime ? `${stats.value.avgFirstResponseTime.toFixed(1)}h` : '-',
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
])


</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <section class="space-y-3 sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-border/70 sm:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_34%),hsl(var(--background))] sm:px-6 sm:py-6 sm:shadow-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div class="space-y-2">
          <span class="hidden items-center rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
            CRM Overview
          </span>
          <h1 class="text-xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p class="max-w-[32rem] text-sm leading-6 text-muted-foreground sm:text-base">
            <template v-if="isAdmin()">
              Overview of user Dynamics CRM cases and metrics
            </template>
            <template v-else>
              Overview of your Dynamics CRM cases and metrics
            </template>
          </p>
        </div>

        <div
          v-if="stats && !isAdmin()"
          class="hidden min-w-[132px] rounded-2xl border border-border/70 bg-background/80 p-3 text-right sm:block"
        >
          <p class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">SLA</p>
          <p class="mt-1 text-2xl font-semibold">{{ kpis?.slaCompliancePercent ?? 0 }}%</p>
          <p class="text-xs text-muted-foreground">Compliant</p>
        </div>
      </div>
    </section>

    <!-- Admin User Selection -->
    <template v-if="isAdmin()">
      <!-- User Selector Card -->
      <UiCard v-if="!selectedUserId" class="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_36%),hsl(var(--background))]">
        <UiCardHeader>
          <div class="flex items-center gap-3">
            <div class="rounded-full bg-primary/10 p-3">
              <Users class="h-6 w-6 text-primary" />
            </div>
            <div>
              <UiCardTitle>Select a User</UiCardTitle>
              <UiCardDescription>
                Choose a user to view their Dynamics CRM dashboard
              </UiCardDescription>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="usersLoading" class="space-y-4">
            <UiSkeleton class="h-10 w-full" />
          </div>

          <UiAlert v-else-if="usersError" variant="destructive">
            <AlertTriangle class="h-4 w-4" />
            <UiAlertDescription>{{ usersError }}</UiAlertDescription>
          </UiAlert>

          <template v-else-if="users.length > 0">
            <AdminUserSelector
              v-model="selectedUserId"
              :users="users"
              placeholder="Select a user to view their dashboard..."
            />

            <div class="mt-4 text-sm text-muted-foreground">
              <p>
                <strong>{{ users.length }}</strong>
                {{ users.length === 1 ? 'user has' : 'users have' }} connected their Dynamics account
              </p>
            </div>
          </template>

          <div v-else class="text-center py-8 text-muted-foreground">
            <Users class="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p class="text-lg font-medium mb-2">No Connected Users</p>
            <p>No users have connected their Dynamics CRM account yet.</p>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Selected User Header -->
      <UiCard v-else class="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_34%),hsl(var(--muted)/0.35)]">
        <UiCardContent class="py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <UiButton variant="ghost" size="icon" class="mt-0.5 shrink-0 rounded-full" @click="clearUserSelection">
                <ArrowLeft class="h-4 w-4" />
              </UiButton>
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">Viewing dashboard for</p>
                <p class="truncate font-medium">
                  {{ selectedUser?.name || selectedUser?.username }}
                  <span v-if="selectedUser?.email" class="text-muted-foreground">
                    ({{ selectedUser.email }})
                  </span>
                </p>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>

    <!-- Regular User Not Connected State -->
    <UiCard v-else-if="connectionStatus?.connected === false" class="border-dashed">
      <UiCardContent class="flex flex-col items-center justify-center py-12 text-center">
        <div class="rounded-full bg-muted p-3 mb-4">
          <Link2 class="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Connect to Dynamics CRM</h3>
        <p class="text-muted-foreground mb-4 max-w-md">
          Connect your Microsoft account to view cases and metrics from Dynamics 365 CRM.
        </p>
        <NuxtLink to="/settings">
          <UiButton>
            <Link2 class="mr-2 h-4 w-4" />
            Connect Now
          </UiButton>
        </NuxtLink>
      </UiCardContent>
    </UiCard>

    <!-- Loading state (show skeleton while checking connection or loading data) -->
    <div v-if="(isAdmin() && selectedUserId && isLoading) || (!isAdmin() && connectionStatus?.connected !== false && (connectionStatus === null || isLoading))" class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <UiCard v-for="i in 4" :key="i">
        <UiCardContent class="p-4 sm:pt-6">
          <UiSkeleton class="h-4 w-24 mb-2" />
          <UiSkeleton class="h-8 w-16" />
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Dashboard Content -->
    <template v-if="(isAdmin() && selectedUserId) || (!isAdmin() && connectionStatus?.connected)">
      <!-- Error alert -->
      <UiAlert v-if="error" variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <UiAlertDescription>{{ error }}</UiAlertDescription>
      </UiAlert>

      <!-- No data state -->
      <UiCard v-if="!isLoading && !error && !stats && !isAdmin()">
        <UiCardContent class="py-12 text-center">
          <p class="text-muted-foreground">No dashboard data available</p>
        </UiCardContent>
      </UiCard>

      <!-- Stat cards -->
      <div v-if="stats" class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UiCard
          v-for="stat in statCards"
          :key="stat.title"
          class="overflow-hidden border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_45%),hsl(var(--background))]"
        >
          <UiCardContent class="p-4 sm:pt-6">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">{{ stat.title }}</p>
                <p class="mt-2 text-2xl font-bold leading-none sm:text-3xl">{{ stat.value }}</p>
              </div>
              <div :class="['rounded-2xl p-2.5 sm:rounded-full sm:p-3', stat.bgColor]">
                <component :is="stat.icon" :class="['h-4 w-4 sm:h-5 sm:w-5', stat.color]" />
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Charts section -->
      <div v-if="kpis" class="grid gap-3 sm:gap-4 md:grid-cols-2">
        <DashboardCasesByStatusChart :data="kpis?.casesByStatus ?? []" />
        <DashboardCasesByPriorityChart :data="kpis?.casesByPriority ?? []" />
      </div>

      <div v-if="kpis" class="grid gap-3 sm:gap-4 md:grid-cols-2">
        <DashboardResolutionTrendChart :data="kpis?.resolutionTimeTrend ?? []" />
        <DashboardSlaComplianceChart :value="kpis?.slaCompliancePercent ?? 0" />
      </div>

      <!-- Recent Cases -->
      <div v-if="recentCases.length > 0 || !isLoading" class="space-y-3 sm:space-y-4">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Recent Cases</h2>
          <p class="text-sm text-muted-foreground">
            <template v-if="isAdmin()">
              Latest 10 cases from the selected user's Dynamics CRM
            </template>
            <template v-else>
              Latest 10 cases from your Dynamics CRM
            </template>
          </p>
        </div>
        <UiCard class="overflow-hidden">
          <UiCardContent class="p-0 overflow-x-auto">
            <CasesTable
              :cases="recentCases"
              :base-path="isAdmin() ? `/admin/cases/${selectedUserId}` : '/cases'"
              empty-title="No cases found"
            />
          </UiCardContent>
        </UiCard>
      </div>
    </template>
  </div>
</template>
