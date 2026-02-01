<script setup lang="ts">
import { SelectLabel, type SelectLabelProps } from 'radix-vue'
import { cn } from '~/utils/cn'

const props = defineProps<SelectLabelProps & { class?: string }>()
</script>

<template>
  <SelectLabel
    v-bind="props"
    :class="cn('py-1.5 pl-8 pr-2 text-sm font-semibold', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
