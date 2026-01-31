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
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Hours',
      },
    },
  },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Resolution Time Trend</UiCardTitle>
      <UiCardDescription>Average case resolution time over the last 30 days</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div v-if="data.length > 0" class="h-64">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
