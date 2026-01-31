<script setup lang="ts">
import { ArrowLeft, Save, Link2, Unlink, AlertCircle, CheckCircle, Copy } from 'lucide-vue-next'
import type { DynamicsConfig } from '~/types'

const { isAdmin } = useAuth()
const { connectionStatus, fetchConnectionStatus, startDeviceCodeFlow, pollForToken, disconnect, cancelConnect, deviceCode, isConnecting } = useDynamics()
const router = useRouter()

// Redirect non-admins
onMounted(() => {
  if (!isAdmin()) {
    router.push('/')
  }
})

const config = reactive<DynamicsConfig>({
  clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
  tenantId: '',
  orgUrl: '',
})

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')
const success = ref('')
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
const copied = ref(false)

async function fetchConfig() {
  isLoading.value = true
  try {
    const response = await $fetch<DynamicsConfig>('/api/admin/settings/dynamics')
    if (response) {
      config.clientId = response.clientId || '51f81489-12ee-4a9e-aaae-a2591f45987d'
      config.tenantId = response.tenantId || ''
      config.orgUrl = response.orgUrl || ''
    }
  } catch (e) {
    // Config doesn't exist yet, use defaults
  } finally {
    isLoading.value = false
  }
}

async function handleSave() {
  isSaving.value = true
  error.value = ''
  success.value = ''

  try {
    await $fetch('/api/admin/settings/dynamics', {
      method: 'PUT',
      body: config,
    })
    success.value = 'Dynamics configuration saved successfully'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to save configuration'
  } finally {
    isSaving.value = false
  }
}

async function handleConnect() {
  error.value = ''
  success.value = ''

  try {
    const response = await startDeviceCodeFlow()

    // Start polling
    pollInterval.value = setInterval(async () => {
      try {
        const result = await pollForToken(response.device_code)
        if (result.success) {
          clearInterval(pollInterval.value!)
          pollInterval.value = null
          await fetchConnectionStatus()
          success.value = 'Successfully connected to Dynamics CRM'
        }
      } catch (e: unknown) {
        const err = e as { data?: { message?: string } }
        if (err.data?.message !== 'authorization_pending') {
          clearInterval(pollInterval.value!)
          pollInterval.value = null
          error.value = err.data?.message || 'Connection failed'
        }
      }
    }, (response.interval || 5) * 1000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to start device code flow'
  }
}

async function handleDisconnect() {
  error.value = ''
  success.value = ''

  try {
    await disconnect()
    success.value = 'Disconnected from Dynamics CRM'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to disconnect'
  }
}

function handleCancelConnect() {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
  cancelConnect()
}

async function copyCode() {
  if (deviceCode.value?.user_code) {
    await navigator.clipboard.writeText(deviceCode.value.user_code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

onMounted(async () => {
  await fetchConfig()
  await fetchConnectionStatus()
})

onUnmounted(() => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/settings')">
        <ArrowLeft class="h-4 w-4" />
      </UiButton>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Dynamics Connection</h1>
        <p class="text-muted-foreground">Configure and connect to Microsoft Dynamics 365 CRM</p>
      </div>
    </div>

    <UiAlert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <UiAlert v-if="success" variant="success">
      <CheckCircle class="h-4 w-4" />
      <UiAlertDescription>{{ success }}</UiAlertDescription>
    </UiAlert>

    <!-- Connection Status -->
    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Connection Status</UiCardTitle>
        <UiCardDescription>Current Dynamics CRM connection status</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div
              :class="[
                'flex h-12 w-12 items-center justify-center rounded-full',
                connectionStatus?.connected ? 'bg-green-100' : 'bg-muted'
              ]"
            >
              <Link2
                :class="[
                  'h-6 w-6',
                  connectionStatus?.connected ? 'text-green-600' : 'text-muted-foreground'
                ]"
              />
            </div>
            <div>
              <p class="font-medium">
                {{ connectionStatus?.connected ? 'Connected' : 'Not Connected' }}
              </p>
              <p v-if="connectionStatus?.email" class="text-sm text-muted-foreground">
                {{ connectionStatus.email }}
              </p>
            </div>
          </div>

          <UiButton
            v-if="connectionStatus?.connected"
            variant="outline"
            @click="handleDisconnect"
          >
            <Unlink class="mr-2 h-4 w-4" />
            Disconnect
          </UiButton>
          <UiButton
            v-else-if="!isConnecting"
            @click="handleConnect"
          >
            <Link2 class="mr-2 h-4 w-4" />
            Connect
          </UiButton>
        </div>

        <!-- Device Code Dialog -->
        <div v-if="deviceCode" class="mt-6 p-4 border rounded-lg bg-muted/50">
          <h4 class="font-medium mb-2">Complete Authentication</h4>
          <p class="text-sm text-muted-foreground mb-4">
            {{ deviceCode.message }}
          </p>

          <div class="flex items-center gap-4 mb-4">
            <div class="flex-1">
              <p class="text-sm text-muted-foreground mb-1">Your code:</p>
              <div class="flex items-center gap-2">
                <code class="text-2xl font-bold tracking-widest bg-background px-4 py-2 rounded">
                  {{ deviceCode.user_code }}
                </code>
                <UiButton variant="outline" size="icon" @click="copyCode">
                  <Copy v-if="!copied" class="h-4 w-4" />
                  <CheckCircle v-else class="h-4 w-4 text-green-600" />
                </UiButton>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a
              :href="deviceCode.verification_uri"
              target="_blank"
              class="text-primary hover:underline"
            >
              Open {{ deviceCode.verification_uri }}
            </a>
            <UiSpinner size="sm" />
            <span class="text-sm text-muted-foreground">Waiting for authentication...</span>
          </div>

          <UiButton variant="outline" class="mt-4" @click="handleCancelConnect">
            Cancel
          </UiButton>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Configuration -->
    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Dynamics Configuration</UiCardTitle>
        <UiCardDescription>
          Configure your Microsoft Dynamics 365 CRM connection settings
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div v-if="isLoading" class="space-y-4">
          <UiSkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSave">
          <div class="space-y-2">
            <UiLabel for="clientId">Client ID</UiLabel>
            <UiInput
              id="clientId"
              v-model="config.clientId"
              placeholder="Enter your Azure AD App Client ID"
            />
            <p class="text-xs text-muted-foreground">
              The Application (client) ID from your Azure AD app registration
            </p>
          </div>

          <div class="space-y-2">
            <UiLabel for="tenantId">Tenant ID</UiLabel>
            <UiInput
              id="tenantId"
              v-model="config.tenantId"
              placeholder="Enter your Azure AD Tenant ID"
            />
            <p class="text-xs text-muted-foreground">
              The Directory (tenant) ID from your Azure AD
            </p>
          </div>

          <div class="space-y-2">
            <UiLabel for="orgUrl">Organization URL</UiLabel>
            <UiInput
              id="orgUrl"
              v-model="config.orgUrl"
              placeholder="https://your-org.crm.dynamics.com"
            />
            <p class="text-xs text-muted-foreground">
              Your Dynamics 365 CRM organization URL
            </p>
          </div>

          <UiButton type="submit" :disabled="isSaving">
            <UiSpinner v-if="isSaving" size="sm" class="mr-2" />
            <Save v-else class="mr-2 h-4 w-4" />
            Save Configuration
          </UiButton>
        </form>
      </UiCardContent>
    </UiCard>
  </div>
</template>
