<script setup lang="ts">
import { FolderOpen, CheckCircle, Clock, AlertTriangle, TrendingUp, Link2, Users, ArrowLeft } from 'lucide-vue-next'
import type { DashboardStats, DashboardKPIs, Case } from '~/types'
import { formatTimeAgo } from '~/utils/timeAgo'

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
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-muted-foreground">
        <template v-if="isAdmin()">
          Overview of user Dynamics CRM cases and metrics
        </template>
        <template v-else>
          Overview of your Dynamics CRM cases and metrics
        </template>
      </p>
    </div>

    <!-- Admin User Selection -->
    <template v-if="isAdmin()">
      <!-- User Selector Card -->
      <UiCard v-if="!selectedUserId">
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
      <UiCard v-else class="bg-muted/50">
        <UiCardContent class="py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <UiButton variant="ghost" size="icon" @click="clearUserSelection">
                <ArrowLeft class="h-4 w-4" />
              </UiButton>
              <div>
                <p class="text-sm text-muted-foreground">Viewing dashboard for</p>
                <p class="font-medium">
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
    <UiCard v-else-if="!connectionStatus?.connected" class="border-dashed">
      <UiCardContent class="flex flex-col items-center justify-center py-12 text-center">
        <div class="rounded-full bg-muted p-3 mb-4">
          <Link2 class="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Connect to Dynamics CRM</h3>
        <p class="text-muted-foreground mb-4 max-w-md">
          Connect your Microsoft account to view cases and metrics from Dynamics 365 CRM.
        </p>
        <NuxtLink to="/settings/dynamics">
          <UiButton>
            <Link2 class="mr-2 h-4 w-4" />
            Connect Now
          </UiButton>
        </NuxtLink>
      </UiCardContent>
    </UiCard>

    <!-- Loading state -->
    <div v-if="isLoading && (isAdmin() ? selectedUserId : connectionStatus?.connected)" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <UiCard v-for="i in 4" :key="i">
        <UiCardContent class="pt-6">
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
      <div v-if="stats" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UiCard v-for="stat in statCards" :key="stat.title">
          <UiCardContent class="pt-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-muted-foreground">{{ stat.title }}</p>
                <p class="text-2xl font-bold">{{ stat.value }}</p>
              </div>
              <div :class="['rounded-full p-3', stat.bgColor]">
                <component :is="stat.icon" :class="['h-5 w-5', stat.color]" />
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Charts section -->
      <div v-if="kpis" class="grid gap-4 md:grid-cols-2">
        <DashboardCasesByStatusChart :data="kpis?.casesByStatus ?? []" />
        <DashboardCasesByPriorityChart :data="kpis?.casesByPriority ?? []" />
      </div>

      <div v-if="kpis" class="grid gap-4 md:grid-cols-2">
        <DashboardResolutionTrendChart :data="kpis?.resolutionTimeTrend ?? []" />
        <DashboardSlaComplianceChart :value="kpis?.slaCompliancePercent ?? 0" />
      </div>

      <!-- Recent Cases -->
      <UiCard v-if="recentCases.length > 0 || !isLoading">
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <TrendingUp class="h-5 w-5" />
            Recent Cases
          </UiCardTitle>
          <UiCardDescription>
            <template v-if="isAdmin()">
              Latest 10 cases from the selected user's Dynamics CRM
            </template>
            <template v-else>
              Latest 10 cases from your Dynamics CRM
            </template>
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <UiTable v-if="recentCases.length > 0">
            <UiTableHeader>
              <UiTableRow>
                <UiTableHead>Ticket #</UiTableHead>
                <UiTableHead>Title</UiTableHead>
                <UiTableHead>Status</UiTableHead>
                <UiTableHead>Priority</UiTableHead>
                <UiTableHead>Created</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              <UiTableRow v-for="c in recentCases" :key="c.incidentid">
                <UiTableCell class="font-medium">
                  <NuxtLink :to="isAdmin() ? `/admin/cases/${selectedUserId}/${c.incidentid}` : `/cases/${c.incidentid}`" class="hover:underline text-primary">
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
              </UiTableRow>
            </UiTableBody>
          </UiTable>

          <div v-else class="text-center py-8 text-muted-foreground">
            No cases found
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
