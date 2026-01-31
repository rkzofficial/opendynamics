<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  value: number
}

const props = defineProps<Props>()

const chartData = computed(() => ({
  labels: ['Compliant', 'Non-Compliant'],
  datasets: [
    {
      data: [props.value, 100 - props.value],
      backgroundColor: ['#22c55e', '#e5e7eb'],
      borderWidth: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>SLA Compliance</UiCardTitle>
      <UiCardDescription>Percentage of cases meeting SLA requirements</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="relative h-64 flex items-center justify-center">
        <Doughnut :data="chartData" :options="chartOptions" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <p class="text-4xl font-bold">{{ value }}%</p>
            <p class="text-sm text-muted-foreground">Compliant</p>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
