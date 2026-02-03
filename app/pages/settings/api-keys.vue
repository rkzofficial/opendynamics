<script setup lang="ts">
import { Key, Plus, Trash2, Copy, CheckCircle, AlertCircle, ArrowLeft, Info } from 'lucide-vue-next'
import type { ApiKey } from '~/types'

const { user } = useAuth()

// Get current URL for MCP config example
const requestUrl = useRequestURL()
const mcpUrl = computed(() => `${requestUrl.origin}/api/mcp`)

// State
const keys = ref<ApiKey[]>([])
const isLoading = ref(true)
const error = ref('')

// Create dialog state
const showCreateDialog = ref(false)
const createName = ref('')
const createExpiration = ref('')
const isCreating = ref(false)
const createError = ref('')

// Reveal dialog state (shown after key creation)
const showRevealDialog = ref(false)
const revealedKey = ref('')
const copied = ref(false)

// Revoke confirmation state
const showRevokeDialog = ref(false)
const keyToRevoke = ref<ApiKey | null>(null)
const isRevoking = ref(false)

// Fetch API keys
async function fetchKeys() {
  isLoading.value = true
  error.value = ''
  try {
    keys.value = await $fetch<ApiKey[]>('/api/api-keys')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to load API keys'
  } finally {
    isLoading.value = false
  }
}

// Create new API key
async function handleCreate() {
  if (!createName.value.trim()) {
    createError.value = 'Name is required'
    return
  }

  isCreating.value = true
  createError.value = ''

  try {
    const expiresInDays = createExpiration.value ? parseInt(createExpiration.value) : undefined

    const response = await $fetch<{ key: string }>('/api/api-keys', {
      method: 'POST',
      body: {
        name: createName.value.trim(),
        expiresInDays,
      },
    })

    // Close create dialog and show reveal dialog
    showCreateDialog.value = false
    revealedKey.value = response.key
    showRevealDialog.value = true

    // Reset form
    createName.value = ''
    createExpiration.value = ''

    // Refresh the list
    await fetchKeys()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    createError.value = err.data?.message || 'Failed to create API key'
  } finally {
    isCreating.value = false
  }
}

// Copy key to clipboard
async function copyKey() {
  if (revealedKey.value) {
    await navigator.clipboard.writeText(revealedKey.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

// Close reveal dialog
function closeRevealDialog() {
  showRevealDialog.value = false
  revealedKey.value = ''
  copied.value = false
}

// Open revoke confirmation
function confirmRevoke(key: ApiKey) {
  keyToRevoke.value = key
  showRevokeDialog.value = true
}

// Revoke API key
async function handleRevoke() {
  if (!keyToRevoke.value) return

  isRevoking.value = true
  try {
    await $fetch(`/api/api-keys/${keyToRevoke.value._id}`, {
      method: 'DELETE',
    })
    showRevokeDialog.value = false
    keyToRevoke.value = null
    await fetchKeys()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to revoke API key'
  } finally {
    isRevoking.value = false
  }
}

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Format relative time
function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(timestamp)
}

// Expiration options
const expirationOptions = [
  { value: '', label: 'Never expires' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
]

onMounted(() => {
  fetchKeys()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink to="/settings">
        <UiButton variant="ghost" size="icon">
          <ArrowLeft class="h-5 w-5" />
        </UiButton>
      </NuxtLink>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">API Keys</h1>
        <p class="text-muted-foreground">
          Manage API keys for MCP server access
        </p>
      </div>
    </div>

    <!-- Error alert -->
    <UiAlert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <!-- API Keys Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <Key class="h-5 w-5 text-primary" />
            </div>
            <div>
              <UiCardTitle>API Keys</UiCardTitle>
              <UiCardDescription>
                Keys for connecting Claude and other AI assistants
              </UiCardDescription>
            </div>
          </div>
          <UiButton @click="showCreateDialog = true">
            <Plus class="mr-2 h-4 w-4" />
            Create API Key
          </UiButton>
        </div>
      </UiCardHeader>
      <UiCardContent>
        <!-- Loading state -->
        <div v-if="isLoading" class="space-y-4">
          <UiSkeleton v-for="i in 3" :key="i" class="h-16 w-full" />
        </div>

        <!-- Empty state -->
        <div v-else-if="keys.length === 0" class="text-center py-8">
          <Key class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p class="text-muted-foreground">No API keys yet</p>
          <p class="text-sm text-muted-foreground mt-1">
            Create an API key to connect Claude Desktop or other MCP clients
          </p>
        </div>

        <!-- Keys list -->
        <div v-else class="space-y-3">
          <div
            v-for="key in keys"
            :key="key._id"
            class="flex items-center justify-between p-4 rounded-lg bg-muted/50"
          >
            <div class="space-y-1">
              <p class="font-medium">{{ key.name }}</p>
              <div class="flex items-center gap-4 text-sm text-muted-foreground">
                <code class="bg-muted px-2 py-0.5 rounded">{{ key.keyPrefix }}...</code>
                <span>Created {{ formatDate(key.createdAt) }}</span>
                <span>Last used: {{ formatRelativeTime(key.lastUsedAt) }}</span>
                <span v-if="key.expiresAt" class="text-yellow-600">
                  Expires {{ formatDate(key.expiresAt) }}
                </span>
              </div>
            </div>
            <UiButton
              variant="ghost"
              size="icon"
              class="text-destructive hover:text-destructive"
              @click="confirmRevoke(key)"
            >
              <Trash2 class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- How to use Card -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-blue-500/10 p-2">
            <Info class="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <UiCardTitle>How to use API keys</UiCardTitle>
            <UiCardDescription>
              Configure your MCP client with the API key
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Add the following configuration to your Claude Desktop config file:
        </p>
        <div class="relative">
          <pre class="bg-muted p-4 rounded-lg text-sm overflow-x-auto"><code>{
  "mcpServers": {
    "opendynamics": {
      "url": "{{ mcpUrl }}",
      "headers": {
        "Authorization": "Bearer odk_your-api-key-here"
      }
    }
  }
}</code></pre>
        </div>
        <p class="text-sm text-muted-foreground">
          Replace <code class="bg-muted px-1 rounded">odk_your-api-key-here</code> with your actual API key.
        </p>
      </UiCardContent>
    </UiCard>

    <!-- Create Dialog -->
    <UiDialog
      :open="showCreateDialog"
      title="Create API Key"
      description="Create a new API key for MCP server access"
      @update:open="showCreateDialog = $event"
    >
      <div class="space-y-4">
        <UiAlert v-if="createError" variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <UiAlertDescription>{{ createError }}</UiAlertDescription>
        </UiAlert>

        <div class="space-y-2">
          <UiLabel for="keyName">Name</UiLabel>
          <UiInput
            id="keyName"
            v-model="createName"
            placeholder="e.g., Claude Desktop"
          />
          <p class="text-xs text-muted-foreground">
            A label to identify this key
          </p>
        </div>

        <div class="space-y-2">
          <UiLabel for="expiration">Expiration</UiLabel>
          <UiSimpleSelect
            id="expiration"
            v-model="createExpiration"
            :options="expirationOptions"
            placeholder="Select expiration"
          />
        </div>
      </div>

      <template #footer>
        <UiButton
          variant="outline"
          @click="showCreateDialog = false"
        >
          Cancel
        </UiButton>
        <UiButton :disabled="isCreating" @click="handleCreate">
          <UiSpinner v-if="isCreating" size="sm" class="mr-2" />
          Create Key
        </UiButton>
      </template>
    </UiDialog>

    <!-- Reveal Dialog -->
    <UiDialog
      :open="showRevealDialog"
      title="API Key Created"
      @update:open="closeRevealDialog"
    >
      <UiAlert variant="warning" class="mb-4">
        <AlertCircle class="h-4 w-4" />
        <UiAlertDescription>
          Make sure to copy your API key now. You won't be able to see it again!
        </UiAlertDescription>
      </UiAlert>

      <div class="flex items-center gap-2">
        <code class="flex-1 bg-muted px-4 py-3 rounded-lg text-sm font-mono break-all">
          {{ revealedKey }}
        </code>
        <UiButton variant="outline" size="icon" @click="copyKey">
          <Copy v-if="!copied" class="h-4 w-4" />
          <CheckCircle v-else class="h-4 w-4 text-green-600" />
        </UiButton>
      </div>

      <template #footer>
        <UiButton @click="closeRevealDialog">
          Done, I copied it
        </UiButton>
      </template>
    </UiDialog>

    <!-- Revoke Confirmation Dialog -->
    <UiDialog
      :open="showRevokeDialog"
      title="Revoke API Key"
      @update:open="showRevokeDialog = $event"
    >
      <p>
        Are you sure you want to revoke <strong>{{ keyToRevoke?.name }}</strong>?
      </p>
      <p class="text-sm text-muted-foreground mt-2">
        Any applications using this key will no longer be able to connect.
      </p>

      <template #footer>
        <UiButton
          variant="outline"
          @click="showRevokeDialog = false"
        >
          Cancel
        </UiButton>
        <UiButton
          variant="destructive"
          :disabled="isRevoking"
          @click="handleRevoke"
        >
          <UiSpinner v-if="isRevoking" size="sm" class="mr-2" />
          Revoke Key
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
