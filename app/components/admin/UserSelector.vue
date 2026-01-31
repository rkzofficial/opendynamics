<script setup lang="ts">
import { Users } from 'lucide-vue-next'

interface UserWithDynamics {
  _id: string
  username: string
  name?: string
  email?: string
}

interface Props {
  users: UserWithDynamics[]
  modelValue: string | null
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select a user...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedUser = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value || ''),
})

function getUserDisplayName(user: UserWithDynamics): string {
  if (user.name) {
    return `${user.name} (${user.username})`
  }
  if (user.email) {
    return `${user.username} (${user.email})`
  }
  return user.username
}
</script>

<template>
  <div class="space-y-2">
    <UiLabel for="user-select">Select User</UiLabel>
    <UiSelect v-model="selectedUser">
      <UiSelectTrigger id="user-select" class="w-full">
        <Users class="mr-2 h-4 w-4 text-muted-foreground" />
        <UiSelectValue :placeholder="placeholder" />
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectGroup>
          <UiSelectLabel>Users with Dynamics Connection</UiSelectLabel>
          <UiSelectItem
            v-for="user in users"
            :key="user._id"
            :value="user._id"
          >
            {{ getUserDisplayName(user) }}
          </UiSelectItem>
        </UiSelectGroup>
      </UiSelectContent>
    </UiSelect>
  </div>
</template>
