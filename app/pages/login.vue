<script setup lang="ts">
import { LogIn, AlertCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'auth',
})

const { login } = useAuth()
const router = useRouter()

const form = reactive({
  username: '',
  password: '',
})

const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  isLoading.value = true

  try {
    const result = await login(form.username, form.password)
    if (result.success) {
      router.push('/')
    } else {
      error.value = result.error || 'Invalid credentials'
    }
  } catch (e) {
    error.value = 'An error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <UiCard>
      <UiCardHeader class="space-y-1 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
          OD
        </div>
        <UiCardTitle class="text-2xl">Welcome back</UiCardTitle>
        <UiCardDescription>
          Sign in to your OpenDynamics account
        </UiCardDescription>
      </UiCardHeader>

      <UiCardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UiAlert v-if="error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <UiAlertDescription>{{ error }}</UiAlertDescription>
          </UiAlert>

          <div class="space-y-2">
            <UiLabel for="username">Username</UiLabel>
            <UiInput
              id="username"
              v-model="form.username"
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
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
          </div>

          <UiButton type="submit" class="w-full" :disabled="isLoading">
            <UiSpinner v-if="isLoading" size="sm" class="mr-2" />
            <LogIn v-else class="mr-2 h-4 w-4" />
            Sign in
          </UiButton>
        </form>
      </UiCardContent>

      <UiCardFooter class="flex justify-center">
        <p class="text-sm text-muted-foreground">
          Don't have an account?
          <NuxtLink to="/signup" class="text-primary hover:underline">Create one</NuxtLink>
        </p>
      </UiCardFooter>
    </UiCard>
  </div>
</template>
