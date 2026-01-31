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
  <div
    v-if="isActive"
    :class="cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      $attrs.class as string
    )"
  >
    <slot />
  </div>
</template>
