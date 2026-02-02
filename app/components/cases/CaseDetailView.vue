<script setup lang="ts">
import { ArrowLeft, Send, FileText, Copy, Check, Users, AlertTriangle } from 'lucide-vue-next'
import type { Case, ActivitiesResponse } from '~/types'
import type { TimelineItem } from '~/components/cases/ActivityTimeline.vue'
import {
  getStatusLabel,
  getStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getStatusIcon,
  getPriorityIcon,
} from '~/utils/caseHelpers'

interface SLAData {
  deadline?: string
  status?: number
  succeeded?: string
}

interface Props {
  case: Case | null
  activities: ActivitiesResponse | null
  isLoading: boolean
  isLoadingActivities: boolean
  isLoadingSLAKPIs: boolean
  firstResponseSLA?: SLAData | null
  customerUpdateSLA?: SLAData | null
  firstResponseCountdown?: string
  customerUpdateCountdown?: string
  replySubject: string
  replyText: string
  isSubmitting: boolean
  adminUserInfo?: { name: string }
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  firstResponseCountdown: '',
  customerUpdateCountdown: '',
  error: '',
})

const emit = defineEmits<{
  back: []
  submitReply: []
  'update:replySubject': [value: string]
  'update:replyText': [value: string]
}>()

const localReplySubject = computed({
  get: () => props.replySubject,
  set: (value: string) => emit('update:replySubject', value),
})

const localReplyText = computed({
  get: () => props.replyText,
  set: (value: string) => emit('update:replyText', value),
})

const descriptionCopied = ref(false)

async function copyDescription() {
  if (!props.case?.description) return
  await navigator.clipboard.writeText(props.case.description)
  descriptionCopied.value = true
  setTimeout(() => {
    descriptionCopied.value = false
  }, 2000)
}

const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  if (props.activities?.activities) {
    for (const activity of props.activities.activities) {
      items.push({
        id: activity.activityid,
        type: 'activity',
        data: activity,
        date: activity.createdon,
      })
    }
  }

  if (props.activities?.annotations) {
    for (const annotation of props.activities.annotations) {
      items.push({
        id: annotation.annotationid,
        type: 'annotation',
        data: annotation,
        date: annotation.createdon,
      })
    }
  }

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" @click="emit('back')">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Cases
      </UiButton>
    </div>

    <!-- Admin user info card -->
    <UiCard v-if="adminUserInfo" class="bg-muted/50">
      <UiCardContent class="py-4">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary/10 p-2">
            <Users class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Viewing case for user</p>
            <p class="font-medium">{{ adminUserInfo.name }}</p>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <UiSkeleton class="h-8 w-64" />
      <UiSkeleton class="h-48 w-full" />
    </div>

    <!-- Error state -->
    <UiAlert v-else-if="error" variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <template v-else-if="props.case">
      <!-- Case header -->
      <div class="sticky top-16 z-30 -mx-4 -mt-4 mb-6 bg-background px-4 py-4 md:-mx-6 md:-mt-6 md:px-6 md:py-6 border-b">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-sm font-medium text-muted-foreground">
                {{ props.case.ticketnumber }}
              </span>
              <UiBadge :variant="getStatusVariant(props.case.statecode)" class="gap-1">
                <component :is="getStatusIcon(props.case.statecode)" class="h-3 w-3" />
                {{ getStatusLabel(props.case.statecode) }}
              </UiBadge>
              <UiBadge :variant="getPriorityVariant(props.case.prioritycode)" class="gap-1">
                <component :is="getPriorityIcon(props.case.prioritycode)" class="h-3 w-3" />
                {{ getPriorityLabel(props.case.prioritycode) }}
              </UiBadge>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">{{ props.case.title }}</h1>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6 min-w-0">
          <!-- Description -->
          <UiCard>
            <UiCardHeader class="pb-3">
              <div class="flex items-center justify-between">
                <UiCardTitle class="flex items-center gap-2">
                  <FileText class="h-4 w-4 text-muted-foreground" />
                  Description
                </UiCardTitle>
                <UiButton
                  v-if="props.case.description"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="copyDescription"
                >
                  <Check v-if="descriptionCopied" class="h-4 w-4 text-green-500" />
                  <Copy v-else class="h-4 w-4" />
                </UiButton>
              </div>
            </UiCardHeader>
            <UiCardContent>
              <div
                v-if="props.case.description"
                class="rounded-md bg-muted/50 p-4 text-base leading-relaxed whitespace-pre-wrap"
              >
                {{ props.case.description }}
              </div>
              <div v-else class="flex items-center justify-center py-8 text-muted-foreground">
                <span class="italic">No description provided</span>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Reply box -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Add Note</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <div>
                <UiLabel for="subject">Subject (optional)</UiLabel>
                <UiInput
                  id="subject"
                  v-model="localReplySubject"
                  placeholder="Note subject..."
                />
              </div>
              <div>
                <UiLabel for="note">Note</UiLabel>
                <UiTextarea
                  id="note"
                  v-model="localReplyText"
                  placeholder="Write your note here..."
                  :rows="4"
                />
              </div>
              <UiButton
                :disabled="!replyText.trim() || isSubmitting"
                @click="emit('submitReply')"
              >
                <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
                <Send v-else class="mr-2 h-4 w-4" />
                Add Note
              </UiButton>
            </UiCardContent>
          </UiCard>

          <!-- Activity timeline -->
          <CasesActivityTimeline
            :items="timelineItems"
            :is-loading="isLoadingActivities"
            variant="detailed"
          />
        </div>

        <!-- Sidebar -->
        <CasesCaseDetailSidebar
          :case="props.case"
          :first-response-s-l-a="firstResponseSLA"
          :customer-update-s-l-a="customerUpdateSLA"
          :first-response-countdown="firstResponseCountdown"
          :customer-update-countdown="customerUpdateCountdown"
          :is-loading-s-l-a-k-p-is="isLoadingSLAKPIs"
        />
      </div>
    </template>

    <!-- Not found -->
    <UiCard v-else>
      <UiCardContent class="py-12 text-center">
        <AlertTriangle class="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p class="text-muted-foreground">Case not found</p>
        <UiButton variant="outline" class="mt-4" @click="emit('back')">
          {{ adminUserInfo ? 'Go Back' : 'Go to Cases' }}
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
