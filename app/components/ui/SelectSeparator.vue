<script setup lang="ts">
import { SelectSeparator, type SelectSeparatorProps } from 'radix-vue'
import { cn } from '~/utils/cn'

const props = defineProps<SelectSeparatorProps & { class?: string }>()
</script>

<template>
  <SelectSeparator
    v-bind="props"
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>
