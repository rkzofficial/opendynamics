<script setup lang="ts">
import { FolderOpen, Calendar, Clock, Inbox, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'
import type { CaseListItem } from '~/types'
import {
  getStatusReasonLabel,
  getStatusReasonBadgeClass,
  getPriorityLabel,
  getPriorityBadgeClass,
  formatCaseDate,
  getSLABadgeStatus,
  getSLABadgeClass,
} from '~/utils/caseHelpers'

interface Props {
  cases: CaseListItem[]
  basePath?: string
  emptyTitle?: string
  emptyDescription?: string
  sortable?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

const props = withDefaults(defineProps<Props>(), {
  basePath: '/cases',
  emptyTitle: 'No cases found',
  emptyDescription: '',
  sortable: false,
  sortColumn: '',
  sortDirection: 'desc',
})

const emit = defineEmits<{
  'sort-change': [column: string, direction: 'asc' | 'desc']
}>()

interface SortOption {
  key: string
  label: string
}

const sortOptions: SortOption[] = [
  { key: 'ticketnumber', label: 'Ticket #' },
  { key: 'title', label: 'Title' },
  { key: 'prioritycode', label: 'Priority' },
  { key: 'createdon', label: 'Created' },
  { key: 'modifiedon', label: 'Modified' },
]

function handleSort(columnKey: string) {
  if (!props.sortable) return
  const newDirection = props.sortColumn === columnKey && props.sortDirection === 'desc' ? 'asc' : 'desc'
  emit('sort-change', columnKey, newDirection)
}

function getSortLabel(): string {
  const option = sortOptions.find(opt => opt.key === props.sortColumn)
  return option ? option.label : 'Sort by'
}

function getSortDirectionIcon() {
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function getStatusBadgeClass(caseItem: CaseListItem) {
  if (caseItem.statusCode === 1) {
    const slaStatus = getSLABadgeStatus(caseItem.sla, caseItem.statusCode)
    if (slaStatus !== 'none') {
      return getSLABadgeClass(slaStatus)
    }
  }
  return getStatusReasonBadgeClass(caseItem.state)
}

</script>

<template>
  <div class="space-y-3">
    <!-- Sort Dropdown for Mobile -->
    <div v-if="sortable" class="flex items-center justify-between px-1">
      <UiSelect :model-value="sortColumn" @update:model-value="handleSort($event)">
        <UiSelectTrigger class="h-9 w-auto min-w-[160px] bg-background">
          <span class="flex items-center gap-2">
            <component :is="sortColumn ? getSortDirectionIcon() : ArrowUpDown" class="h-3.5 w-3.5" />
            <span class="text-muted-foreground">Sort:</span>
            {{ getSortLabel() }}
          </span>
        </UiSelectTrigger>
        <UiSelectContent>
          <UiSelectItem
            v-for="option in sortOptions"
            :key="option.key"
            :value="option.key"
          >
            <span class="flex items-center gap-2">
              <component 
                :is="sortColumn === option.key ? getSortDirectionIcon() : ArrowUpDown" 
                class="h-3.5 w-3.5"
                :class="sortColumn === option.key ? 'text-foreground' : 'text-muted-foreground/50'"
              />
              {{ option.label }}
            </span>
          </UiSelectItem>
        </UiSelectContent>
      </UiSelect>
      
      <!-- Direction Toggle -->
      <UiButton
        v-if="sortColumn"
        variant="ghost"
        size="sm"
        class="h-9 px-3"
        @click="handleSort(sortColumn)"
      >
        <component :is="getSortDirectionIcon()" class="h-4 w-4" />
        <span class="ml-2 text-xs">{{ sortDirection === 'asc' ? 'Ascending' : 'Descending' }}</span>
      </UiButton>
    </div>

    <!-- Card List -->
    <div v-if="cases.length > 0" class="divide-y border rounded-lg overflow-hidden">
      <NuxtLink
        v-for="(c, index) in cases"
        :key="c.id"
        :to="`${basePath}/${c.id}`"
        class="block px-4 py-3 active:bg-muted/50 cursor-pointer transition-colors bg-background"
      >
      <!-- Row 1: Priority badge (left) + Status reason badge (right) -->
      <div class="flex items-center justify-between gap-2">
        <span
          :class="[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            getPriorityBadgeClass(c.priority)
          ]"
        >
          {{ getPriorityLabel(c.priority) }}
        </span>
        <span
          :class="[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            getStatusBadgeClass(c)
          ]"
        >
          {{ getStatusReasonLabel(c.statusLabel) }}
        </span>
      </div>

      <!-- Row 2: Index + Ticket number -->
      <p class="mt-2 font-mono text-sm font-medium text-primary">
        <span class="text-muted-foreground">{{ index + 1 }}</span>
        <span class="text-muted-foreground mx-1">&middot;</span>
        {{ c.ticketNumber }}
      </p>

      <!-- Row 3: Title -->
      <p class="mt-0.5 font-medium line-clamp-1">
        {{ c.title }}
      </p>

      <!-- Row 4: Description preview -->
      <p v-if="c.description" class="mt-0.5 text-sm text-muted-foreground line-clamp-2">
        {{ c.description }}
      </p>

      <!-- Row 5: Dates + Queue -->
      <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span class="flex items-center gap-3">
          <span class="flex items-center gap-1" :title="formatCaseDate(c.createdAt, true).tooltip">
            <Calendar class="h-3 w-3" />
            {{ formatCaseDate(c.createdAt, true).text }}
          </span>
          <span class="flex items-center gap-1" :title="formatCaseDate(c.modifiedAt, true).tooltip">
            <Clock class="h-3 w-3" />
            {{ formatCaseDate(c.modifiedAt, true).text }}
          </span>
        </span>
        <span
          v-if="c.queue?.name"
          class="flex items-center gap-1"
        >
          <Inbox class="h-3 w-3" />
          {{ c.queue?.name }}
        </span>
      </div>
    </NuxtLink>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <FolderOpen class="h-8 w-8 opacity-50" />
    </div>
    <p class="font-medium">{{ emptyTitle }}</p>
    <p v-if="emptyDescription" class="text-sm mt-1">{{ emptyDescription }}</p>
  </div>
</template>
