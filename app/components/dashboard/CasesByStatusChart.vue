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
      backgroundColor: ['#3b82f6', '#22c55e', '#6b7280'],
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
    },
  },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Cases by Status</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div v-if="data.length > 0" class="h-64">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    </UiCardContent>
  </UiCard>
</template>
