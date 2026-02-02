<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  casesCount: number
  hasMore: boolean
  canGoBack: boolean
  pageSize?: number
}

defineProps<Props>()

const emit = defineEmits<{
  previous: []
  next: []
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
    <p class="text-sm text-muted-foreground">
      Showing <span class="font-medium text-foreground">{{ casesCount }}</span> 
      {{ casesCount === 1 ? 'case' : 'cases' }}
    </p>
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
</template>
