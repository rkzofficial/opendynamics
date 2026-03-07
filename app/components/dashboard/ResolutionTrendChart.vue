<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Props {
  data: { date: string; avgHours: number }[]
}

const props = defineProps<Props>()

const chartData = computed(() => ({
  labels: props.data.map((d) => {
    const date = new Date(d.date)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }),
  datasets: [
    {
      label: 'Avg Resolution Time (hours)',
      data: props.data.map((d) => d.avgHours),
      borderColor: 'hsl(217.2 91.2% 59.8%)',
      backgroundColor: 'hsla(217.2 91.2% 59.8% / 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxTicksLimit: 6,
        font: {
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Hours',
      },
      ticks: {
        maxTicksLimit: 5,
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
      <UiCardTitle>Resolution Time Trend</UiCardTitle>
      <UiCardDescription>Average case resolution time over the last 30 days</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="p-4 pt-3 sm:p-6 sm:pt-4">
      <div v-if="data.length > 0" class="h-56 sm:h-64">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="flex h-56 items-center justify-center text-muted-foreground sm:h-64">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
