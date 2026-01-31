<script setup lang="ts">
import { Users, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const selectedUserId = ref<string | null>(null)

// Redirect to userId page when a user is selected
watch(selectedUserId, (newValue) => {
  if (newValue) {
    router.push(`/admin/cases/${newValue}`)
  }
})

// Fetch users on mount
const { users, loading, error, fetchUsersWithDynamics } = useAdminCases()

onMounted(() => {
  fetchUsersWithDynamics()
})

// Redirect back to index if this is accessed directly (though it shouldn't happen)
// This is the selection page, not the cases view page
const isIndex = computed(() => route.path === '/admin/cases')
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/')">
        <ArrowLeft class="h-4 w-4" />
      </UiButton>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">User Cases</h1>
        <p class="text-muted-foreground">
          View Dynamics CRM cases for connected users
        </p>
      </div>
    </div>

    <!-- Error Alert -->
    <UiAlert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <!-- User Selection Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary/10 p-3">
            <Users class="h-6 w-6 text-primary" />
          </div>
          <div>
            <UiCardTitle>Select a User</UiCardTitle>
            <UiCardDescription>
              Choose a user to view their Dynamics CRM cases
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent>
        <div v-if="loading" class="space-y-4">
          <UiSkeleton class="h-10 w-full" />
        </div>
        
        <template v-else-if="users.length > 0">
          <AdminUserSelector
            v-model="selectedUserId"
            :users="users"
            placeholder="Select a user to view their cases..."
          />
          
          <div class="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>{{ users.length }}</strong> 
              {{ users.length === 1 ? 'user has' : 'users have' }} connected their Dynamics account
            </p>
          </div>
        </template>
        
        <div v-else class="text-center py-8 text-muted-foreground">
          <Users class="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p class="text-lg font-medium mb-2">No Connected Users</p>
          <p>No users have connected their Dynamics CRM account yet.</p>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>
