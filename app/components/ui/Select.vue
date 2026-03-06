<script setup lang="ts">
import { SelectRoot, type SelectRootEmits, type SelectRootProps, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<SelectRootProps>()
const emits = defineEmits<SelectRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
const { trigger } = useHaptics()

function handleValueUpdate() {
  trigger('selection')
}
</script>

<template>
  <SelectRoot v-bind="forwarded" @update:model-value="handleValueUpdate">
    <slot />
  </SelectRoot>
</template>
