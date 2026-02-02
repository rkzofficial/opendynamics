<script setup lang="ts">
import { Hash, FileText, CircleDot, Flag, Calendar, Clock, FolderOpen, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next'
import type { Case } from '~/types'
import {
  getStatusLabel,
  getStatusBadgeClass,
  getPriorityLabel,
  getPriorityBadgeClass,
  formatCaseDate,
} from '~/utils/caseHelpers'

interface Props {
  cases: Case[]
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

const router = useRouter()

interface ColumnConfig {
  key: string
  label: string
  icon: Component
  width: string
}

const columns: ColumnConfig[] = [
  { key: 'ticketnumber', label: 'Ticket', icon: Hash, width: 'w-[130px]' },
  { key: 'title', label: 'Title', icon: FileText, width: '' },
  { key: 'statecode', label: 'Status', icon: CircleDot, width: 'w-[100px]' },
  { key: 'prioritycode', label: 'Priority', icon: Flag, width: 'w-[150px]' },
  { key: 'createdon', label: 'Created', icon: Calendar, width: 'w-[120px]' },
  { key: 'modifiedon', label: 'Modified', icon: Clock, width: 'w-[120px]' },
]

function handleRowClick(caseId: string) {
  router.push(`${props.basePath}/${caseId}`)
}

function handleSort(columnKey: string) {
  if (!props.sortable) return
  const newDirection = props.sortColumn === columnKey && props.sortDirection === 'desc' ? 'asc' : 'desc'
  emit('sort-change', columnKey, newDirection)
}

function getSortIcon(columnKey: string): Component {
  if (props.sortColumn !== columnKey) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}
</script>

<template>
  <div v-if="cases.length > 0" class="overflow-x-auto">
    <table class="w-full min-w-[880px] table-fixed">
      <thead>
        <tr class="border-b bg-muted/50">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[
              'h-12 px-3 text-left align-middle font-medium text-muted-foreground',
              col.width,
              sortable ? 'cursor-pointer select-none hover:bg-muted/80 transition-colors' : ''
            ]"
            @click="handleSort(col.key)"
          >
            <span class="flex items-center gap-1.5">
              <component :is="col.icon" class="h-3.5 w-3.5" />
              {{ col.label }}
              <component
                v-if="sortable"
                :is="getSortIcon(col.key)"
                :class="[
                  'h-3.5 w-3.5 ml-auto',
                  sortColumn === col.key ? 'text-foreground' : 'text-muted-foreground/50'
                ]"
              />
            </span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr
          v-for="c in cases"
          :key="c.incidentid"
          class="group transition-colors hover:bg-muted/50 cursor-pointer"
          @click="handleRowClick(c.incidentid)"
        >
          <td class="h-14 px-3 align-middle">
            <span class="font-mono text-sm font-medium text-primary">
              {{ c.ticketnumber }}
            </span>
          </td>
          <td class="px-3 py-3 align-middle overflow-hidden">
            <UiTooltip :content="c.description" position="bottom" max-width="450px">
              <div class="overflow-hidden">
                <p class="truncate font-medium">{{ c.title }}</p>
                <p v-if="c.description" class="truncate text-sm text-muted-foreground mt-0.5">
                  {{ c.description }}
                </p>
              </div>
            </UiTooltip>
          </td>
          <td class="h-14 px-3 align-middle">
            <span
              :class="[
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                getStatusBadgeClass(c.statecode)
              ]"
            >
              {{ getStatusLabel(c.statecode) }}
            </span>
          </td>
          <td class="h-14 px-3 align-middle">
            <span
              :class="[
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                getPriorityBadgeClass(c.prioritycode)
              ]"
            >
              {{ getPriorityLabel(c.prioritycode) }}
            </span>
          </td>
          <td class="h-14 px-3 align-middle">
            <span :title="formatCaseDate(c.createdon, true).tooltip" class="text-sm text-muted-foreground">
              {{ formatCaseDate(c.createdon, true).text }}
            </span>
          </td>
          <td class="h-14 px-3 align-middle">
            <span :title="formatCaseDate(c.modifiedon, true).tooltip" class="text-sm text-muted-foreground">
              {{ formatCaseDate(c.modifiedon, true).text }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <div class="rounded-full bg-muted p-4 mb-4">
      <FolderOpen class="h-8 w-8 opacity-50" />
    </div>
    <p class="font-medium">{{ emptyTitle }}</p>
    <p v-if="emptyDescription" class="text-sm mt-1">{{ emptyDescription }}</p>
  </div>
</template>
