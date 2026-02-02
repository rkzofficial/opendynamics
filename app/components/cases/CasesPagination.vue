<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  casesCount: number
  hasMore: boolean
  canGoBack: boolean
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20
})

const emit = defineEmits<{
  previous: []
  next: []
  pageSizeChange: [size: number]
}>()

const pageSizeOptions = [
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
]
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
    <p class="text-sm text-muted-foreground">
      Showing <span class="font-medium text-foreground">{{ casesCount }}</span>
      {{ casesCount === 1 ? 'case' : 'cases' }}
    </p>
    <div class="flex items-center gap-4">
      <UiSelect
        :model-value="String(props.pageSize)"
        @update:model-value="emit('pageSizeChange', Number($event))"
      >
        <UiSelectTrigger class="h-8 w-auto min-w-[120px] bg-background">
          <UiSelectValue />
        </UiSelectTrigger>
        <UiSelectContent>
          <UiSelectItem
            v-for="opt in pageSizeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </UiSelectItem>
        </UiSelectContent>
      </UiSelect>
      <div class="flex gap-2">
        <UiButton
          variant="outline"
          size="sm"
          :disabled="!canGoBack"
          @click="emit('previous')"
        >
          <ChevronLeft class="mr-1 h-4 w-4" />
          Previous
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="!hasMore"
          @click="emit('next')"
        >
          Next
          <ChevronRight class="ml-1 h-4 w-4" />
        </UiButton>
      </div>
    </div>
  </div>
</template>
