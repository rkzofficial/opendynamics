<script setup lang="ts">
import { Hash, FileText, CircleDot, Flag, Calendar, Clock, FolderOpen } from 'lucide-vue-next'
import type { Case } from '~/types'
import {
  getStatusLabel,
  getStatusDotColor,
  getPriorityLabel,
  getPriorityIcon,
  getPriorityIconColor,
  formatCaseDate,
} from '~/utils/caseHelpers'

interface Props {
  cases: Case[]
  basePath?: string

  emptyTitle?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  basePath: '/cases',

  emptyTitle: 'No cases found',
  emptyDescription: '',
})

const router = useRouter()

function handleRowClick(caseId: string) {
  router.push(`${props.basePath}/${caseId}`)
}
</script>

<template>
  <div v-if="cases.length > 0" class="overflow-x-auto">
    <table class="w-full min-w-[880px] table-fixed">
      <thead>
        <tr class="border-b bg-muted/50">
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[130px]">
            <span class="flex items-center gap-1.5">
              <Hash class="h-3.5 w-3.5" />
              Ticket
            </span>
          </th>
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
            <span class="flex items-center gap-1.5">
              <FileText class="h-3.5 w-3.5" />
              Title
            </span>
          </th>
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">
            <span class="flex items-center gap-1.5">
              <CircleDot class="h-3.5 w-3.5" />
              Status
            </span>
          </th>
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">
            <span class="flex items-center gap-1.5">
              <Flag class="h-3.5 w-3.5" />
              Priority
            </span>
          </th>
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[120px]">
            <span class="flex items-center gap-1.5">
              <Calendar class="h-3.5 w-3.5" />
              Created
            </span>
          </th>
          <th class="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-[120px]">
            <span class="flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              Modified
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
            <div class="flex items-center gap-1.5">
              <span
                :class="[
                  'h-2 w-2 rounded-full flex-shrink-0',
                  getStatusDotColor(c.statecode)
                ]"
              />
              <span class="text-sm">{{ getStatusLabel(c.statecode) }}</span>
            </div>
          </td>
          <td class="h-14 px-3 align-middle">
            <div class="flex items-center gap-1.5">
              <component
                :is="getPriorityIcon(c.prioritycode)"
                :class="[
                  'h-4 w-4 flex-shrink-0',
                  getPriorityIconColor(c.prioritycode)
                ]"
              />
              <span class="text-sm">{{ getPriorityLabel(c.prioritycode) }}</span>
            </div>
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
