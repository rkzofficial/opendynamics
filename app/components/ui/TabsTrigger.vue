<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { cn } from '~/utils/cn'

interface Props {
  value: string
}

const props = defineProps<Props>()

const tabs = inject<{
  activeTab: Ref<string>
  setActiveTab: (value: string) => void
}>('tabs')

const isActive = computed(() => tabs?.activeTab.value === props.value)
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      isActive && 'bg-background text-foreground shadow-sm',
      $attrs.class as string
    )"
    @click="tabs?.setActiveTab(value)"
  >
    <slot />
  </button>
</template>
