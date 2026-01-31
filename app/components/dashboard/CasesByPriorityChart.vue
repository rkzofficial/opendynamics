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
      backgroundColor: ['#ef4444', '#eab308', '#6b7280'],
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
    y: {
      beginAtZero: true,
    },
  },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Cases by Priority</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div v-if="data.length > 0" class="h-64">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
