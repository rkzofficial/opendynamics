<script setup lang="ts">
import { Mail, Phone, FileText, MessageSquare, Calendar, Clock, User } from 'lucide-vue-next'
import type { Activity, Annotation } from '~/types'
import { processEmailHtml } from '~/utils/email-processor'
import {
  formatCaseDate,
  getActivityIcon,
  getActivityLabel,
  linkifyText,
} from '~/utils/caseHelpers'

export interface TimelineItem {
  id: string
  type: 'activity' | 'annotation'
  data: Activity | Annotation
  date: string
}

interface Props {
  items: TimelineItem[]
  isLoading?: boolean
  variant?: 'detailed' | 'simple'
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  variant: 'detailed',
})

function getActivityContent(activity: Activity): string {
  if (activity.activitytypecode === 'email' && activity.attachments) {
    return processEmailHtml(activity.description || '', activity.attachments)
  }
  if (props.variant === 'detailed') {
    return linkifyText(activity.description || '')
  }
  return activity.description || ''
}

function getActivityColorClasses(item: TimelineItem): { border: string; header: string; badge: string; dot: string } {
  if (item.type === 'annotation') {
    return {
      border: 'border-l-4 border-l-amber-400 dark:border-l-amber-500',
      header: 'bg-amber-50/50 dark:bg-amber-900/10',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      dot: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    }
  }

  const activityType = (item.data as Activity).activitytypecode
  switch (activityType) {
    case 'email':
      return {
        border: 'border-l-4 border-l-blue-400 dark:border-l-blue-500',
        header: 'bg-blue-50/50 dark:bg-blue-900/10',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        dot: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      }
    case 'phonecall':
      return {
        border: 'border-l-4 border-l-green-400 dark:border-l-green-500',
        header: 'bg-green-50/50 dark:bg-green-900/10',
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        dot: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
      }
    case 'task':
      return {
        border: 'border-l-4 border-l-purple-400 dark:border-l-purple-500',
        header: 'bg-purple-50/50 dark:bg-purple-900/10',
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        dot: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
      }
    case 'ent_customernote': {
      const subject = (item.data as Activity).subject?.toLowerCase() || ''
      if (subject.includes('from: adobe') || subject.startsWith('from:adobe')) {
        return {
          border: 'border-l-4 border-l-rose-400 dark:border-l-rose-500',
          header: 'bg-rose-50/50 dark:bg-rose-900/10',
          badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
          dot: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
        }
      }
      return {
        border: 'border-l-4 border-l-cyan-400 dark:border-l-cyan-500',
        header: 'bg-cyan-50/50 dark:bg-cyan-900/10',
        badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        dot: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
      }
    }
    case 'ent_internalnote':
      return {
        border: 'border-l-4 border-l-orange-400 dark:border-l-orange-500',
        header: 'bg-orange-50/50 dark:bg-orange-900/10',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        dot: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
      }
    default:
      return {
        border: 'border-l-4 border-l-gray-300 dark:border-l-gray-600',
        header: 'bg-muted/30',
        badge: 'bg-muted text-muted-foreground',
        dot: 'bg-muted text-muted-foreground'
      }
  }
}
</script>

<template>
  <UiCard>
    <UiCardHeader class="pb-3">
      <UiCardTitle class="flex items-center gap-2">
        <Clock class="h-4 w-4 text-muted-foreground" />
        Activity Timeline
      </UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div v-if="isLoading" class="space-y-4">
        <UiSkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
      </div>

      <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare class="h-12 w-12 mb-3 opacity-40" />
        <p class="text-sm">No activities yet</p>
      </div>

      <!-- Detailed variant (with colored borders and timeline) -->
      <template v-else-if="variant === 'detailed'">
        <div class="relative">
          <div class="space-y-6">
            <div
              v-for="(item, index) in items"
              :key="item.id"
              class="relative pl-12"
            >
              <!-- Timeline connector line (not on last item) -->
              <div
                v-if="index < items.length - 1"
                class="absolute left-5 top-10 bottom-0 -mb-6 w-px bg-border -translate-x-1/2"
              />

              <!-- Timeline dot -->
              <div
                :class="[
                  'absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background shadow-sm',
                  getActivityColorClasses(item).dot
                ]"
              >
                <component
                  :is="item.type === 'annotation' ? FileText : getActivityIcon((item.data as Activity).activitytypecode)"
                  class="h-4 w-4"
                />
              </div>

              <!-- Content card -->
              <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
                <!-- Header -->
                <div :class="['flex items-center justify-between gap-3 px-4 py-3 border-b', getActivityColorClasses(item).header]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        getActivityColorClasses(item).badge
                      ]"
                    >
                      {{ item.type === 'annotation' ? 'Note' : getActivityLabel((item.data as Activity).activitytypecode) }}
                    </span>
                    <span class="font-medium truncate">
                      {{ item.type === 'annotation'
                        ? ((item.data as Annotation).subject || 'Untitled Note')
                        : ((item.data as Activity).subject || 'No subject')
                      }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                    <Calendar class="h-3 w-3" />
                    <span :title="formatCaseDate(item.date).tooltip">{{ formatCaseDate(item.date).text }}</span>
                  </div>
                </div>

                <!-- Body -->
                <div class="p-4">
                  <div
                    v-if="item.type === 'activity'"
                    :class="[
                      'prose prose-sm max-w-full break-words overflow-x-auto [&_img]:max-w-full [&_table]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto dark:prose-invert',
                      (item.data as Activity).activitytypecode === 'email'
                        ? 'bg-gray-50 dark:bg-zinc-800/50 rounded-md p-4 border border-gray-200 dark:border-zinc-700'
                        : ''
                    ]"
                    v-html="getActivityContent(item.data as Activity)"
                  />
                  <div
                    v-else
                    class="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden text-foreground"
                    v-html="linkifyText((item.data as Annotation).notetext || '')"
                  />
                </div>

                <!-- Footer (if has author) -->
                <div
                  v-if="item.type === 'annotation' && (item.data as Annotation).createdby?.fullname"
                  class="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground"
                >
                  <User class="h-3 w-3" />
                  <span>{{ (item.data as Annotation).createdby?.fullname }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Simple variant -->
      <template v-else>
        <div class="space-y-4">
          <div
            v-for="item in items"
            :key="item.id"
            class="flex gap-4 p-4 rounded-lg border"
          >
            <div class="flex-shrink-0">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <component
                  :is="item.type === 'annotation' ? FileText : getActivityIcon((item.data as Activity).activitytypecode)"
                  class="h-5 w-5"
                />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">
                  {{ item.type === 'annotation'
                    ? ((item.data as Annotation).subject || 'Note')
                    : ((item.data as Activity).subject || (item.data as Activity).activitytypecode)
                  }}
                </span>
                <span :title="formatCaseDate(item.date).tooltip" class="text-xs text-muted-foreground">
                  {{ formatCaseDate(item.date).text }}
                </span>
              </div>
              <div
                v-if="item.type === 'activity'"
                :class="[
                  'text-sm prose prose-sm max-w-full overflow-x-auto [&_img]:max-w-full [&_table]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto p-3 rounded border',
                  (item.data as Activity).activitytypecode === 'email'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'text-muted-foreground border-transparent'
                ]"
                v-html="getActivityContent(item.data as Activity)"
              />
              <p
                v-else
                class="text-sm text-muted-foreground whitespace-pre-wrap"
              >
                {{ (item.data as Annotation).notetext }}
              </p>
              <div v-if="item.type === 'annotation' && (item.data as Annotation).createdby?.fullname" class="mt-1 text-xs text-muted-foreground">
                By {{ (item.data as Annotation).createdby?.fullname }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </UiCardContent>
  </UiCard>
</template>
