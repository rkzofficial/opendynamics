<script setup lang="ts">
import { Copy, CheckCircle, ExternalLink } from 'lucide-vue-next'
import type { DeviceCodeResponse } from '~/types'

interface Props {
  open: boolean
  deviceCode: DeviceCodeResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  cancel: []
}>()

const copied = ref(false)

async function copyCode() {
  if (props.deviceCode?.user_code) {
    await navigator.clipboard.writeText(props.deviceCode.user_code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Connect to Microsoft"
    description="Complete the authentication in your browser"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="deviceCode" class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {{ deviceCode.message }}
      </p>

      <div class="space-y-2">
        <p class="text-sm font-medium">Your code:</p>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-2xl font-bold tracking-widest bg-muted px-4 py-3 rounded text-center">
            {{ deviceCode.user_code }}
          </code>
          <UiButton variant="outline" size="icon" @click="copyCode">
            <Copy v-if="!copied" class="h-4 w-4" />
            <CheckCircle v-else class="h-4 w-4 text-green-600" />
          </UiButton>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <a
          :href="deviceCode.verification_uri"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {{ deviceCode.verification_uri }}
          <ExternalLink class="h-3 w-3" />
        </a>
      </div>

      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <UiSpinner size="sm" />
        <span>Waiting for authentication...</span>
      </div>
    </div>

    <template #footer>
      <UiButton variant="outline" @click="handleCancel">
        Cancel
      </UiButton>
    </template>
  </UiDialog>
</template>
