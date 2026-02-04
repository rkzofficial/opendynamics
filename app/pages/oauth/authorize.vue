<script setup lang="ts">
import { LogIn, Shield, X, Check, AlertCircle, ExternalLink } from 'lucide-vue-next'

definePageMeta({
  layout: 'oauth',
})

const route = useRoute()
const { user, isAuthenticated, isLoading: authLoading, login } = useAuth()

// OAuth params from URL
const clientId = computed(() => route.query.client_id as string)
const redirectUri = computed(() => route.query.redirect_uri as string)
const responseType = computed(() => route.query.response_type as string)
const scope = computed(() => (route.query.scope as string) ?? 'mcp')
const state = computed(() => route.query.state as string | undefined)
const codeChallenge = computed(() => route.query.code_challenge as string)
const codeChallengeMethod = computed(() => route.query.code_challenge_method as string)
const clientName = computed(() => (route.query.client_name as string) ?? 'External Application')

// Login form state
const loginForm = reactive({
  username: '',
  password: '',
})
const loginError = ref('')
const isLoggingIn = ref(false)

// Consent state
const isProcessing = ref(false)
const error = ref('')

// Parse scope into individual permissions
const permissions = computed(() => {
  const scopes = scope.value.split(' ')
  const permissionMap: Record<string, string> = {
    mcp: 'Access MCP tools and resources',
    openid: 'Verify your identity',
    profile: 'View your profile information',
  }
  return scopes.map((s) => ({
    scope: s,
    description: permissionMap[s] ?? `Access: ${s}`,
  }))
})

// Validate OAuth params
const isValid = computed(() => {
  return (
    clientId.value &&
    redirectUri.value &&
    responseType.value === 'code' &&
    codeChallenge.value &&
    codeChallengeMethod.value === 'S256'
  )
})

async function handleLogin() {
  loginError.value = ''
  isLoggingIn.value = true

  try {
    const result = await login(loginForm.username, loginForm.password)
    if (!result.success) {
      loginError.value = result.error || 'Invalid credentials'
    }
  } catch (e) {
    loginError.value = 'An error occurred. Please try again.'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleAuthorize(action: 'approve' | 'deny') {
  isProcessing.value = true
  error.value = ''

  try {
    const response = await $fetch<{ redirect: string }>('/api/oauth/authorize', {
      method: 'POST',
      body: {
        client_id: clientId.value,
        redirect_uri: redirectUri.value,
        scope: scope.value,
        code_challenge: codeChallenge.value,
        code_challenge_method: codeChallengeMethod.value,
        state: state.value,
        user_id: user.value?._id,
        action,
      },
    })

    if (response.redirect) {
      window.location.href = response.redirect
    }
  } catch (e: unknown) {
    const err = e as Error
    error.value = err.message || 'Authorization failed'
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- Invalid request -->
    <UiCard v-if="!isValid">
      <UiCardHeader class="text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle class="h-6 w-6" />
        </div>
        <UiCardTitle>Invalid Request</UiCardTitle>
        <UiCardDescription>
          This authorization request is missing required parameters or has invalid values.
        </UiCardDescription>
      </UiCardHeader>
    </UiCard>

    <!-- Loading state -->
    <UiCard v-else-if="authLoading">
      <UiCardContent class="flex items-center justify-center py-12">
        <UiSpinner size="lg" />
      </UiCardContent>
    </UiCard>

    <!-- Login form (not authenticated) -->
    <UiCard v-else-if="!isAuthenticated">
      <UiCardHeader class="space-y-1 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
          OD
        </div>
        <UiCardTitle class="text-2xl">Sign in to continue</UiCardTitle>
        <UiCardDescription>
          <span class="font-medium text-foreground">{{ clientName }}</span> wants to access your OpenDynamics account
        </UiCardDescription>
      </UiCardHeader>

      <UiCardContent>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <UiAlert v-if="loginError" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <UiAlertDescription>{{ loginError }}</UiAlertDescription>
          </UiAlert>

          <div class="space-y-2">
            <UiLabel for="username">Username</UiLabel>
            <UiInput
              id="username"
              v-model="loginForm.username"
              type="text"
              placeholder="Enter your username"
              required
              autocomplete="username"
            />
          </div>

          <div class="space-y-2">
            <UiLabel for="password">Password</UiLabel>
            <UiInput
              id="password"
              v-model="loginForm.password"
              type="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
          </div>

          <UiButton type="submit" class="w-full" :disabled="isLoggingIn">
            <UiSpinner v-if="isLoggingIn" size="sm" class="mr-2" />
            <LogIn v-else class="mr-2 h-4 w-4" />
            Sign in
          </UiButton>
        </form>
      </UiCardContent>
    </UiCard>

    <!-- Consent form (authenticated) -->
    <UiCard v-else>
      <UiCardHeader class="text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Shield class="h-6 w-6" />
        </div>
        <UiCardTitle class="text-xl">Authorize Access</UiCardTitle>
        <UiCardDescription>
          <span class="font-medium text-foreground">{{ clientName }}</span> wants to access your account
        </UiCardDescription>
      </UiCardHeader>

      <UiCardContent class="space-y-6">
        <UiAlert v-if="error" variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <UiAlertDescription>{{ error }}</UiAlertDescription>
        </UiAlert>

        <!-- User info -->
        <div class="rounded-lg border bg-muted/50 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
              {{ user?.username?.[0]?.toUpperCase() ?? 'U' }}
            </div>
            <div>
              <p class="font-medium">{{ user?.name ?? user?.username }}</p>
              <p class="text-sm text-muted-foreground">{{ user?.email ?? user?.username }}</p>
            </div>
          </div>
        </div>

        <!-- Permissions -->
        <div class="space-y-3">
          <p class="text-sm font-medium">This will allow the application to:</p>
          <ul class="space-y-2">
            <li v-for="perm in permissions" :key="perm.scope" class="flex items-start gap-2 text-sm">
              <Check class="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span>{{ perm.description }}</span>
            </li>
          </ul>
        </div>

        <!-- Redirect info -->
        <div class="rounded-lg border border-muted p-3 text-xs text-muted-foreground">
          <div class="flex items-center gap-1">
            <ExternalLink class="h-3 w-3" />
            <span>Will redirect to: {{ redirectUri }}</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
          <UiButton
            variant="outline"
            class="flex-1"
            :disabled="isProcessing"
            @click="handleAuthorize('deny')"
          >
            <X class="mr-2 h-4 w-4" />
            Deny
          </UiButton>
          <UiButton
            class="flex-1"
            :disabled="isProcessing"
            @click="handleAuthorize('approve')"
          >
            <UiSpinner v-if="isProcessing" size="sm" class="mr-2" />
            <Check v-else class="mr-2 h-4 w-4" />
            Authorize
          </UiButton>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>
