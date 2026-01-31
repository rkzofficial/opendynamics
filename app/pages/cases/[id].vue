<script setup lang="ts">
import { ArrowLeft, Send, Mail, Phone, FileText, MessageSquare, Calendar } from 'lucide-vue-next'
import type { Activity, Annotation } from '~/types'

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const {
  currentCase,
  activities,
  isLoading,
  isLoadingActivities,
  fetchCase,
  fetchActivities,
  addReply,
} = useCases()

const replyText = ref('')
const replySubject = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  await fetchCase(caseId)
  await fetchActivities(caseId)
})

async function handleSubmitReply() {
  if (!replyText.value.trim()) return

  isSubmitting.value = true
  try {
    const result = await addReply(caseId, replyText.value, replySubject.value || undefined)
    if (result.success) {
      replyText.value = ''
      replySubject.value = ''
    }
  } finally {
    isSubmitting.value = false
  }
}

function getStatusLabel(statecode: number) {
  switch (statecode) {
    case 0: return 'Active'
    case 1: return 'Resolved'
    case 2: return 'Cancelled'
    default: return 'Unknown'
  }
}

function getStatusVariant(statecode: number): 'default' | 'success' | 'secondary' {
  switch (statecode) {
    case 0: return 'default'
    case 1: return 'success'
    case 2: return 'secondary'
    default: return 'secondary'
  }
}

function getPriorityLabel(prioritycode: number) {
  switch (prioritycode) {
    case 1: return 'High'
    case 2: return 'Normal'
    case 3: return 'Low'
    default: return 'Unknown'
  }
}

function getPriorityVariant(prioritycode: number): 'destructive' | 'warning' | 'secondary' {
  switch (prioritycode) {
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    default: return 'secondary'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString()
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'email': return Mail
    case 'phonecall': return Phone
    case 'task': return FileText
    default: return MessageSquare
  }
}

interface TimelineItem {
  id: string
  type: 'activity' | 'annotation'
  data: Activity | Annotation
  date: string
}

const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  if (activities.value?.activities) {
    for (const activity of activities.value.activities) {
      items.push({
        id: activity.activityid,
        type: 'activity',
        data: activity,
        date: activity.createdon,
      })
    }
  }

  if (activities.value?.annotations) {
    for (const annotation of activities.value.annotations) {
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
    <UiButton variant="ghost" @click="router.push('/cases')">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Cases
    </UiButton>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <UiSkeleton class="h-8 w-64" />
      <UiSkeleton class="h-48 w-full" />
    </div>

    <template v-else-if="currentCase">
      <!-- Case header -->
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="text-sm font-medium text-muted-foreground">
              {{ currentCase.ticketnumber }}
            </span>
            <UiBadge :variant="getStatusVariant(currentCase.statecode)">
              {{ getStatusLabel(currentCase.statecode) }}
            </UiBadge>
            <UiBadge :variant="getPriorityVariant(currentCase.prioritycode)">
              {{ getPriorityLabel(currentCase.prioritycode) }}
            </UiBadge>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">{{ currentCase.title }}</h1>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Description -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Description</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <p v-if="currentCase.description" class="whitespace-pre-wrap">
                {{ currentCase.description }}
              </p>
              <p v-else class="text-muted-foreground italic">No description provided</p>
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
                  v-model="replySubject"
                  placeholder="Note subject..."
                />
              </div>
              <div>
                <UiLabel for="note">Note</UiLabel>
                <UiTextarea
                  id="note"
                  v-model="replyText"
                  placeholder="Write your note here..."
                  :rows="4"
                />
              </div>
              <UiButton
                :disabled="!replyText.trim() || isSubmitting"
                @click="handleSubmitReply"
              >
                <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
                <Send v-else class="mr-2 h-4 w-4" />
                Add Note
              </UiButton>
            </UiCardContent>
          </UiCard>

          <!-- Activity timeline -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Activity Timeline</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <div v-if="isLoadingActivities" class="space-y-4">
                <UiSkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
              </div>

              <div v-else-if="timelineItems.length === 0" class="text-center py-8 text-muted-foreground">
                No activities yet
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="item in timelineItems"
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
                      <span class="text-xs text-muted-foreground">
                        {{ formatDate(item.date) }}
                      </span>
                    </div>
                    <p class="text-sm text-muted-foreground whitespace-pre-wrap">
                      {{ item.type === 'annotation'
                        ? (item.data as Annotation).notetext
                        : (item.data as Activity).description
                      }}
                    </p>
                    <div v-if="item.type === 'annotation' && (item.data as Annotation).createdby?.fullname" class="mt-1 text-xs text-muted-foreground">
                      By {{ (item.data as Annotation).createdby?.fullname }}
                    </div>
                  </div>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Case info -->
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Case Information</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <div>
                <p class="text-sm text-muted-foreground">Ticket Number</p>
                <p class="font-medium">{{ currentCase.ticketnumber }}</p>
              </div>
              <UiSeparator />
              <div>
                <p class="text-sm text-muted-foreground">Status</p>
                <UiBadge :variant="getStatusVariant(currentCase.statecode)">
                  {{ getStatusLabel(currentCase.statecode) }}
                </UiBadge>
              </div>
              <UiSeparator />
              <div>
                <p class="text-sm text-muted-foreground">Priority</p>
                <UiBadge :variant="getPriorityVariant(currentCase.prioritycode)">
                  {{ getPriorityLabel(currentCase.prioritycode) }}
                </UiBadge>
              </div>
              <UiSeparator />
              <div class="flex items-center gap-2">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                <div>
                  <p class="text-sm text-muted-foreground">Created</p>
                  <p class="text-sm">{{ formatDate(currentCase.createdon) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                <div>
                  <p class="text-sm text-muted-foreground">Modified</p>
                  <p class="text-sm">{{ formatDate(currentCase.modifiedon) }}</p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Customer info -->
          <UiCard v-if="currentCase.customerid_contact">
            <UiCardHeader>
              <UiCardTitle>Customer</UiCardTitle>
            </UiCardHeader>
            <UiCardContent class="space-y-2">
              <p class="font-medium">{{ currentCase.customerid_contact.fullname }}</p>
              <p v-if="currentCase.customerid_contact.emailaddress1" class="text-sm text-muted-foreground">
                {{ currentCase.customerid_contact.emailaddress1 }}
              </p>
            </UiCardContent>
          </UiCard>

          <!-- Owner info -->
          <UiCard v-if="currentCase.ownerid">
            <UiCardHeader>
              <UiCardTitle>Owner</UiCardTitle>
            </UiCardHeader>
            <UiCardContent>
              <p class="font-medium">{{ currentCase.ownerid.fullname }}</p>
            </UiCardContent>
          </UiCard>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <UiCard v-else>
      <UiCardContent class="py-12 text-center">
        <p class="text-muted-foreground">Case not found</p>
        <UiButton variant="outline" class="mt-4" @click="router.push('/cases')">
          Go to Cases
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
