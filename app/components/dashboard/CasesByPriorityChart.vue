<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  data: { priority: string; count: number }[]
}

const props = defineProps<Props>()

const chartData = computed(() => ({
  labels: props.data.map((d) => d.priority),
  datasets: [
    {
      label: 'Cases',
      data: props.data.map((d) => d.count),
      backgroundColor: [
        'hsl(0 84.2% 60.2%)',
        'hsl(45 93.4% 47.5%)',
        'hsl(var(--muted-foreground))',
      ],
      borderWidth: 0,
      borderRadius: 4,
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
        font: {
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
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
      <UiCardTitle>Cases by Priority</UiCardTitle>
    </UiCardHeader>
    <UiCardContent class="p-4 pt-3 sm:p-6 sm:pt-4">
      <div v-if="data.length > 0" class="h-56 sm:h-64">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="flex h-56 items-center justify-center text-muted-foreground sm:h-64">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
