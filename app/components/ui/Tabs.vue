<script setup lang="ts">
import { provide, ref } from 'vue'
import { cn } from '~/utils/cn'

interface Props {
  defaultValue?: string
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = ref(props.modelValue || props.defaultValue)

function setActiveTab(value: string) {
  activeTab.value = value
  emit('update:modelValue', value)
}

provide('tabs', {
  activeTab,
  setActiveTab,
})
</script>

<template>
  <div :class="cn($attrs.class as string)">
    <slot />
  </div>
</template>
