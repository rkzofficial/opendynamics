<script setup lang="ts">
import { Save, Link2, Unlink, AlertCircle, CheckCircle, Copy, Shield, User } from 'lucide-vue-next'
import type { OIDCConfig, DynamicsConfig } from '~/types'

const { user, isAdmin } = useAuth()
const { connectionStatus, fetchConnectionStatus, startDeviceCodeFlow, pollForToken, disconnect, cancelConnect, deviceCode, isConnecting } = useDynamics()

// OIDC Config
const oidcConfig = reactive<OIDCConfig>({
  enabled: false,
  issuerUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: ['openid', 'profile', 'email'],
})

const oidcLoading = ref(true)
const oidcSaving = ref(false)
const oidcError = ref('')
const oidcSuccess = ref('')

// Dynamics Config
const dynamicsConfig = reactive<DynamicsConfig>({
  clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
  tenantId: '',
  orgUrl: '',
})

const dynamicsLoading = ref(true)
const dynamicsSaving = ref(false)
const dynamicsError = ref('')
const dynamicsSuccess = ref('')
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
const copied = ref(false)

// OIDC Functions
async function fetchOIDCConfig() {
  oidcLoading.value = true
  try {
    const response = await $fetch<OIDCConfig>('/api/admin/settings/oidc')
    if (response) {
      oidcConfig.enabled = response.enabled
      oidcConfig.issuerUrl = response.issuerUrl || ''
      oidcConfig.clientId = response.clientId || ''
      oidcConfig.clientSecret = response.clientSecret || ''
      oidcConfig.scopes = response.scopes || ['openid', 'profile', 'email']
    }
  } catch (e) {
    // Config doesn't exist yet, use defaults
  } finally {
    oidcLoading.value = false
  }
}

async function handleSaveOIDC() {
  oidcSaving.value = true
  oidcError.value = ''
  oidcSuccess.value = ''

  try {
    await $fetch('/api/admin/settings/oidc', {
      method: 'PUT',
      body: oidcConfig,
    })
    oidcSuccess.value = 'OIDC configuration saved successfully'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    oidcError.value = err.data?.message || 'Failed to save configuration'
  } finally {
    oidcSaving.value = false
  }
}

// Dynamics Functions
async function fetchDynamicsConfig() {
  dynamicsLoading.value = true
  try {
    const response = await $fetch<DynamicsConfig>('/api/admin/settings/dynamics')
    if (response) {
      dynamicsConfig.clientId = response.clientId || '51f81489-12ee-4a9e-aaae-a2591f45987d'
      dynamicsConfig.tenantId = response.tenantId || ''
      dynamicsConfig.orgUrl = response.orgUrl || ''
    }
  } catch (e) {
    // Config doesn't exist yet, use defaults
  } finally {
    dynamicsLoading.value = false
  }
}

async function handleSaveDynamics() {
  dynamicsSaving.value = true
  dynamicsError.value = ''
  dynamicsSuccess.value = ''

  try {
    await $fetch('/api/admin/settings/dynamics', {
      method: 'PUT',
      body: dynamicsConfig,
    })
    dynamicsSuccess.value = 'Dynamics configuration saved successfully'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    dynamicsError.value = err.data?.message || 'Failed to save configuration'
  } finally {
    dynamicsSaving.value = false
  }
}

async function handleConnect() {
  dynamicsError.value = ''
  dynamicsSuccess.value = ''

  try {
    const response = await startDeviceCodeFlow()

    pollInterval.value = setInterval(async () => {
      try {
        const result = await pollForToken(response.device_code)
        if (result.success) {
          clearInterval(pollInterval.value!)
          pollInterval.value = null
          await fetchConnectionStatus()
          dynamicsSuccess.value = 'Successfully connected to Dynamics CRM'
        }
      } catch (e: unknown) {
        const err = e as { data?: { message?: string } }
        if (err.data?.message !== 'authorization_pending') {
          clearInterval(pollInterval.value!)
          pollInterval.value = null
          dynamicsError.value = err.data?.message || 'Connection failed'
        }
      }
    }, (response.interval || 5) * 1000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    dynamicsError.value = err.data?.message || 'Failed to start device code flow'
  }
}

async function handleDisconnect() {
  dynamicsError.value = ''
  dynamicsSuccess.value = ''

  try {
    await disconnect()
    dynamicsSuccess.value = 'Disconnected from Dynamics CRM'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    dynamicsError.value = err.data?.message || 'Failed to disconnect'
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
  if (isAdmin()) {
    await fetchOIDCConfig()
    await fetchDynamicsConfig()
  }
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
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
      <p class="text-muted-foreground">
        Manage your application settings and configurations
      </p>
    </div>

    <!-- User Profile Section (for non-admins) -->
    <UiCard v-if="!isAdmin()">
      <UiCardHeader>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <User class="h-5 w-5 text-primary" />
          </div>
          <div>
            <UiCardTitle>Profile</UiCardTitle>
            <UiCardDescription>
              Your account information
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <div class="space-y-2">
          <UiLabel>Username</UiLabel>
          <p class="text-sm text-muted-foreground">{{ user?.username }}</p>
        </div>
        <div class="space-y-2">
          <UiLabel>Email</UiLabel>
          <p class="text-sm text-muted-foreground">{{ user?.email || 'Not set' }}</p>
        </div>
        <div class="space-y-2">
          <UiLabel>Name</UiLabel>
          <p class="text-sm text-muted-foreground">{{ user?.name || 'Not set' }}</p>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- OIDC Configuration Section (admin only) -->
    <UiCard v-if="isAdmin()">
      <UiCardHeader>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <Shield class="h-5 w-5 text-primary" />
          </div>
          <div>
            <UiCardTitle>OIDC Configuration</UiCardTitle>
            <UiCardDescription>
              Configure Single Sign-On with OpenID Connect
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <UiAlert v-if="oidcError" variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <UiAlertDescription>{{ oidcError }}</UiAlertDescription>
        </UiAlert>

        <UiAlert v-if="oidcSuccess" variant="success">
          <CheckCircle class="h-4 w-4" />
          <UiAlertDescription>{{ oidcSuccess }}</UiAlertDescription>
        </UiAlert>

        <div v-if="oidcLoading" class="space-y-4">
          <UiSkeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSaveOIDC">
          <div class="flex items-center space-x-2">
            <UiCheckbox
              id="enabled"
              :checked="oidcConfig.enabled"
              @update:checked="oidcConfig.enabled = $event"
            />
            <UiLabel for="enabled">Enable OIDC Authentication</UiLabel>
          </div>

          <div class="space-y-4" :class="{ 'opacity-50 pointer-events-none': !oidcConfig.enabled }">
            <div class="space-y-2">
              <UiLabel for="issuerUrl">Issuer URL</UiLabel>
              <UiInput
                id="issuerUrl"
                v-model="oidcConfig.issuerUrl"
                placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
              />
              <p class="text-xs text-muted-foreground">
                The OpenID Connect issuer URL from your identity provider
              </p>
            </div>

            <div class="space-y-2">
              <UiLabel for="clientId">Client ID</UiLabel>
              <UiInput
                id="clientId"
                v-model="oidcConfig.clientId"
                placeholder="Enter your client ID"
              />
            </div>

            <div class="space-y-2">
              <UiLabel for="clientSecret">Client Secret</UiLabel>
              <UiInput
                id="clientSecret"
                v-model="oidcConfig.clientSecret"
                type="password"
                placeholder="Enter your client secret"
              />
            </div>

            <div class="space-y-2">
              <UiLabel for="scopes">Scopes (comma-separated)</UiLabel>
              <UiInput
                id="scopes"
                :model-value="oidcConfig.scopes?.join(', ')"
                placeholder="openid, profile, email"
                @update:model-value="oidcConfig.scopes = ($event as string).split(',').map(s => s.trim())"
              />
            </div>
          </div>

          <UiButton type="submit" :disabled="oidcSaving">
            <UiSpinner v-if="oidcSaving" size="sm" class="mr-2" />
            <Save v-else class="mr-2 h-4 w-4" />
            Save OIDC Configuration
          </UiButton>
        </form>
      </UiCardContent>
    </UiCard>

    <!-- Dynamics Connection Section (for all users) -->
    <UiCard>
      <UiCardHeader>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <Link2 class="h-5 w-5 text-primary" />
          </div>
          <div>
            <UiCardTitle>Dynamics CRM Connection</UiCardTitle>
            <UiCardDescription>
              {{ isAdmin() ? 'Configure Microsoft Dynamics 365 CRM settings and manage connection' : 'Connect to Microsoft Dynamics 365 CRM' }}
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>
      <UiCardContent class="space-y-6">
        <UiAlert v-if="dynamicsError" variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <UiAlertDescription>{{ dynamicsError }}</UiAlertDescription>
        </UiAlert>

        <UiAlert v-if="dynamicsSuccess" variant="success">
          <CheckCircle class="h-4 w-4" />
          <UiAlertDescription>{{ dynamicsSuccess }}</UiAlertDescription>
        </UiAlert>

        <!-- Connection Status -->
        <div class="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div class="flex items-center gap-4">
            <div
              :class="[
                'flex h-12 w-12 items-center justify-center rounded-full',
                connectionStatus?.connected ? 'bg-green-100' : 'bg-background'
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
        <div v-if="deviceCode" class="p-4 border rounded-lg bg-muted/50">
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

        <!-- Dynamics Configuration Section (admin only) -->
        <div v-if="isAdmin()" class="border-t pt-6">
          <h4 class="text-sm font-medium mb-4">Configuration</h4>
          
          <div v-if="dynamicsLoading" class="space-y-4">
            <UiSkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
          </div>

          <form v-else class="space-y-4" @submit.prevent="handleSaveDynamics">
            <div class="space-y-2">
              <UiLabel for="clientId">Client ID</UiLabel>
              <UiInput
                id="clientId"
                v-model="dynamicsConfig.clientId"
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
                v-model="dynamicsConfig.tenantId"
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
                v-model="dynamicsConfig.orgUrl"
                placeholder="https://your-org.crm.dynamics.com"
              />
              <p class="text-xs text-muted-foreground">
                Your Dynamics 365 CRM organization URL
              </p>
            </div>

            <UiButton type="submit" :disabled="dynamicsSaving" variant="outline">
              <UiSpinner v-if="dynamicsSaving" size="sm" class="mr-2" />
              <Save v-else class="mr-2 h-4 w-4" />
              Save Dynamics Configuration
            </UiButton>
          </form>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>
