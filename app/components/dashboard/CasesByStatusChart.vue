<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  data: { status: string; count: number }[]
}

const props = defineProps<Props>()

const chartData = computed(() => ({
  labels: props.data.map((d) => d.status),
  datasets: [
    {
      data: props.data.map((d) => d.count),
      backgroundColor: [
        'hsl(217.2 91.2% 59.8%)',
        'hsl(142.1 70.6% 45.3%)',
        'hsl(var(--muted-foreground))',
      ],
      borderWidth: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        padding: 12,
        usePointStyle: true,
        pointStyle: 'circle' as const,
        font: {
          size: 11,
        },
      },
    },
  },
}
</script>

<template>
  <UiCard class="overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%),hsl(var(--background))]">
    <UiCardHeader class="space-y-1.5 p-4 pb-0 sm:p-6 sm:pb-0">
      <UiCardTitle>Cases by Status</UiCardTitle>
    </UiCardHeader>
    <UiCardContent class="p-4 pt-3 sm:p-6 sm:pt-4">
      <div v-if="data.length > 0" class="h-56 sm:h-64">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="flex h-56 items-center justify-center text-muted-foreground sm:h-64">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
