<script setup lang="ts">
import { UserPlus, AlertCircle, Copy, CheckCircle, ArrowLeft } from 'lucide-vue-next'

definePageMeta({
  layout: 'auth',
})

const router = useRouter()

type Step = 'form' | 'connecting' | 'polling'

const step = ref<Step>('form')
const form = reactive({
  name: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
})

const isLoading = ref(false)
const error = ref('')
const deviceCode = ref<{
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
} | null>(null)
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
const copied = ref(false)
const { trigger } = useHaptics()

// Validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(): string | null {
  if (!form.name.trim()) return 'Name is required'
  if (!form.email.trim()) return 'Email is required'
  if (!emailRegex.test(form.email)) return 'Please enter a valid email address'
  if (!form.username.trim()) return 'Username is required'
  if (form.username.length < 3) return 'Username must be at least 3 characters'
  if (!form.password) return 'Password is required'
  if (form.password.length < 8) return 'Password must be at least 8 characters'
  if (form.password !== form.confirmPassword) return 'Passwords do not match'
  return null
}

async function handleSubmit() {
  error.value = ''
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    trigger('error')
    return
  }

  isLoading.value = true
  step.value = 'connecting'

  try {
    // Start device code flow (validates username/email uniqueness)
    const response = await $fetch<{
      device_code: string
      user_code: string
      verification_uri: string
      expires_in: number
      interval: number
      message: string
    }>('/api/auth/signup/device-code', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        username: form.username,
      },
    })

    deviceCode.value = response
    step.value = 'polling'
    isLoading.value = false

    // Start polling for token
    startPolling(response.device_code, response.interval)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to start signup process'
    step.value = 'form'
    isLoading.value = false
    trigger('error')
  }
}

function startPolling(code: string, interval: number) {
  pollInterval.value = setInterval(async () => {
    try {
      const response = await $fetch<{ success: boolean; user?: unknown }>('/api/auth/signup', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          username: form.username,
          password: form.password,
          deviceCode: code,
        },
      })

      if (response.success) {
        clearPolling()
        trigger('success')
        router.push('/')
      }
    } catch (e: unknown) {
      const err = e as { status?: number; data?: { message?: string } }

      // 202 means authorization pending, keep polling
      if (err.status === 202) {
        return
      }

      // Any other error, stop polling and show error
      clearPolling()
      error.value = err.data?.message || 'Authentication failed'
      step.value = 'form'
      trigger('error')
    }
  }, (interval || 5) * 1000)
}

function clearPolling() {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}

function handleCancel() {
  clearPolling()
  deviceCode.value = null
  step.value = 'form'
  error.value = ''
  trigger('warning')
}

async function copyCode() {
  if (deviceCode.value?.user_code) {
    await navigator.clipboard.writeText(deviceCode.value.user_code)
    trigger('copy')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

onUnmounted(() => {
  clearPolling()
})
</script>

<template>
  <div class="w-full max-w-md">
    <UiCard>
      <UiCardHeader class="space-y-1 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
          OD
        </div>
        <UiCardTitle class="text-2xl">Create an account</UiCardTitle>
        <UiCardDescription>
          Connect to Dynamics 365 to get started
        </UiCardDescription>
      </UiCardHeader>

      <UiCardContent>
        <!-- Form Step -->
        <form v-if="step === 'form'" class="space-y-4" @submit.prevent="handleSubmit">
          <UiAlert v-if="error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <UiAlertDescription>{{ error }}</UiAlertDescription>
          </UiAlert>

          <div class="space-y-2">
            <UiLabel for="name">Name</UiLabel>
            <UiInput
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Enter your full name"
              required
              autocomplete="name"
            />
          </div>

          <div class="space-y-2">
            <UiLabel for="email">Email</UiLabel>
            <UiInput
              id="email"
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              required
              autocomplete="email"
            />
          </div>

          <div class="space-y-2">
            <UiLabel for="username">Username</UiLabel>
            <UiInput
              id="username"
              v-model="form.username"
              type="text"
              placeholder="Choose a username"
              required
              autocomplete="username"
            />
          </div>

          <div class="space-y-2">
            <UiLabel for="password">Password</UiLabel>
            <UiInput
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Create a password (min 8 characters)"
              required
              autocomplete="new-password"
            />
          </div>

          <div class="space-y-2">
            <UiLabel for="confirmPassword">Confirm Password</UiLabel>
            <UiInput
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              autocomplete="new-password"
            />
          </div>

          <UiButton type="submit" class="w-full" :disabled="isLoading" haptic-intent="none">
            <UiSpinner v-if="isLoading" size="sm" class="mr-2" />
            <UserPlus v-else class="mr-2 h-4 w-4" />
            Create Account
          </UiButton>
        </form>

        <!-- Connecting Step -->
        <div v-else-if="step === 'connecting'" class="flex flex-col items-center justify-center py-8">
          <UiSpinner size="lg" class="mb-4" />
          <p class="text-muted-foreground">Starting Dynamics 365 connection...</p>
        </div>

        <!-- Polling Step - Device Code UI -->
        <div v-else-if="step === 'polling' && deviceCode" class="space-y-4">
          <UiAlert v-if="error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <UiAlertDescription>{{ error }}</UiAlertDescription>
          </UiAlert>

          <div class="space-y-4">
            <div class="text-center">
              <p class="text-sm text-muted-foreground mb-3">Your code:</p>
              <div class="flex items-center justify-center gap-2 mb-3">
                <code class="text-2xl font-bold tracking-widest bg-muted px-4 py-2 rounded">
                  {{ deviceCode.user_code }}
                </code>
                <UiButton variant="outline" size="icon" @click="copyCode">
                  <Copy v-if="!copied" class="h-4 w-4" />
                  <CheckCircle v-else class="h-4 w-4 text-green-600" />
                </UiButton>
              </div>
              <a
                :href="deviceCode.verification_uri"
                target="_blank"
                class="text-primary hover:underline text-sm"
              >
                Open {{ deviceCode.verification_uri }}
              </a>
            </div>

            <div class="flex items-center justify-center gap-2 pt-2">
              <UiSpinner size="sm" />
              <span class="text-sm text-muted-foreground">Waiting for authentication...</span>
            </div>

            <div class="flex justify-center pt-2">
              <UiButton variant="outline" @click="handleCancel">
                <ArrowLeft class="mr-2 h-4 w-4" />
                Cancel
              </UiButton>
            </div>
          </div>
        </div>
      </UiCardContent>

      <UiCardFooter class="flex justify-center">
        <p class="text-sm text-muted-foreground">
          Already have an account?
          <NuxtLink to="/login" class="text-primary hover:underline">Sign in</NuxtLink>
        </p>
      </UiCardFooter>
    </UiCard>
  </div>
</template>
