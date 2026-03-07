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
      backgroundColor: ['hsl(142.1 70.6% 45.3%)', 'hsl(var(--muted))'],
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
  <UiCard class="overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%),hsl(var(--background))]">
    <UiCardHeader class="space-y-1.5 p-4 pb-0 sm:p-6 sm:pb-0">
      <UiCardTitle>SLA Compliance</UiCardTitle>
      <UiCardDescription>Percentage of cases meeting SLA requirements</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="p-4 pt-3 sm:p-6 sm:pt-4">
      <div class="relative flex h-56 items-center justify-center sm:h-64">
        <Doughnut :data="chartData" :options="chartOptions" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <p class="text-3xl font-bold sm:text-4xl">{{ value }}%</p>
            <p class="text-xs text-muted-foreground sm:text-sm">Compliant</p>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
