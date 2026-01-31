<script setup lang="ts">
import { FolderOpen, CheckCircle, Clock, AlertTriangle, TrendingUp, Link2 } from 'lucide-vue-next'
import type { DashboardStats, DashboardKPIs, Case } from '~/types'

const { connectionStatus } = useDynamics()

const stats = ref<DashboardStats | null>(null)
const kpis = ref<DashboardKPIs | null>(null)
const recentCases = ref<Case[]>([])
const isLoading = ref(true)
const error = ref('')

async function fetchDashboardData() {
  if (!connectionStatus.value?.connected) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const [statsResponse, kpisResponse, casesResponse] = await Promise.all([
      $fetch<DashboardStats>('/api/kpi/dashboard'),
      $fetch<DashboardKPIs>('/api/kpi/dashboard?type=kpis'),
      $fetch<{ cases: Case[] }>('/api/cases?pageSize=10&orderBy=createdon&orderDirection=desc'),
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

watch(
  () => connectionStatus.value?.connected,
  (connected) => {
    if (connected) {
      fetchDashboardData()
    }
  },
  { immediate: true }
)

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-muted-foreground">
        Overview of your Dynamics CRM cases and metrics
      </p>
    </div>

    <!-- Not connected state -->
    <UiCard v-if="!connectionStatus?.connected" class="border-dashed">
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
    <div v-else-if="isLoading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <UiCard v-for="i in 4" :key="i">
        <UiCardContent class="pt-6">
          <UiSkeleton class="h-4 w-24 mb-2" />
          <UiSkeleton class="h-8 w-16" />
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Connected state -->
    <template v-else>
      <!-- Error alert -->
      <UiAlert v-if="error" variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <UiAlertDescription>{{ error }}</UiAlertDescription>
      </UiAlert>

      <!-- Stat cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      <div class="grid gap-4 md:grid-cols-2">
        <DashboardCasesByStatusChart :data="kpis?.casesByStatus ?? []" />
        <DashboardCasesByPriorityChart :data="kpis?.casesByPriority ?? []" />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <DashboardResolutionTrendChart :data="kpis?.resolutionTimeTrend ?? []" />
        <DashboardSlaComplianceChart :value="kpis?.slaCompliancePercent ?? 0" />
      </div>

      <!-- Recent Cases -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <TrendingUp class="h-5 w-5" />
            Recent Cases
          </UiCardTitle>
          <UiCardDescription>
            Latest 10 cases from your Dynamics CRM
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
                <UiTableCell>{{ formatDate(c.createdon) }}</UiTableCell>
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
