<script setup lang="ts">
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-vue-next'
import type { OIDCConfig } from '~/types'

const { isAdmin } = useAuth()
const router = useRouter()
const { trigger } = useHaptics()

// Redirect non-admins
onMounted(() => {
  if (!isAdmin()) {
    router.push('/')
  }
})

const config = reactive<OIDCConfig>({
  enabled: false,
  issuerUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: ['openid', 'profile', 'email'],
})

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')
const success = ref('')

async function fetchConfig() {
  isLoading.value = true
  try {
    const response = await $fetch<OIDCConfig>('/api/admin/settings/oidc')
    if (response) {
      config.enabled = response.enabled
      config.issuerUrl = response.issuerUrl || ''
      config.clientId = response.clientId || ''
      config.clientSecret = response.clientSecret || ''
      config.scopes = response.scopes || ['openid', 'profile', 'email']
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
    await $fetch('/api/admin/settings/oidc', {
      method: 'PUT',
      body: config,
    })
    success.value = 'OIDC configuration saved successfully'
    trigger('success')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to save configuration'
    trigger('error')
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchConfig)

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" haptic-intent="none" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
      </UiButton>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">OIDC Configuration</h1>
        <p class="text-muted-foreground">Configure Single Sign-On with OpenID Connect</p>
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

    <UiCard>
      <UiCardHeader>
        <UiCardTitle>OIDC Settings</UiCardTitle>
        <UiCardDescription>
          Configure your identity provider for Single Sign-On
        </UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div v-if="isLoading" class="space-y-4">
          <UiSkeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSave">
          <div class="flex items-center space-x-2">
            <UiCheckbox
              id="enabled"
              :checked="config.enabled"
              @update:checked="config.enabled = $event"
            />
            <UiLabel for="enabled">Enable OIDC Authentication</UiLabel>
          </div>

          <div class="space-y-4" :class="{ 'opacity-50 pointer-events-none': !config.enabled }">
            <div class="space-y-2">
              <UiLabel for="issuerUrl">Issuer URL</UiLabel>
              <UiInput
                id="issuerUrl"
                v-model="config.issuerUrl"
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
                v-model="config.clientId"
                placeholder="Enter your client ID"
              />
            </div>

            <div class="space-y-2">
              <UiLabel for="clientSecret">Client Secret</UiLabel>
              <UiInput
                id="clientSecret"
                v-model="config.clientSecret"
                type="password"
                placeholder="Enter your client secret"
              />
            </div>

            <div class="space-y-2">
              <UiLabel for="scopes">Scopes (comma-separated)</UiLabel>
              <UiInput
                id="scopes"
                :model-value="config.scopes?.join(', ')"
                placeholder="openid, profile, email"
                @update:model-value="config.scopes = ($event as string).split(',').map(s => s.trim())"
              />
            </div>
          </div>

          <UiButton type="submit" :disabled="isSaving" haptic-intent="none">
            <UiSpinner v-if="isSaving" size="sm" class="mr-2" />
            <Save v-else class="mr-2 h-4 w-4" />
            Save Configuration
          </UiButton>
        </form>
      </UiCardContent>
    </UiCard>
  </div>
</template>
