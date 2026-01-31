<script setup lang="ts">
import { Plus, Pencil, Trash2, ArrowLeft, AlertCircle } from 'lucide-vue-next'
import type { User } from '~/types'

const { isAdmin } = useAuth()
const router = useRouter()

// Redirect non-admins
onMounted(() => {
  if (!isAdmin()) {
    router.push('/')
  }
})

const users = ref<User[]>([])
const isLoading = ref(true)
const error = ref('')

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedUser = ref<User | null>(null)

const createForm = reactive({
  username: '',
  password: '',
  email: '',
  name: '',
  role: 'user' as 'admin' | 'user',
})

const editForm = reactive({
  email: '',
  name: '',
  role: 'user' as 'admin' | 'user',
  password: '',
})

const isSubmitting = ref(false)

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]

async function fetchUsers() {
  isLoading.value = true
  try {
    const response = await $fetch<User[]>('/api/admin/users')
    users.value = response
  } catch (e) {
    error.value = 'Failed to load users'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateUser() {
  isSubmitting.value = true
  error.value = ''

  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: createForm,
    })
    showCreateDialog.value = false
    createForm.username = ''
    createForm.password = ''
    createForm.email = ''
    createForm.name = ''
    createForm.role = 'user'
    await fetchUsers()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to create user'
  } finally {
    isSubmitting.value = false
  }
}

function openEditDialog(user: User) {
  selectedUser.value = user
  editForm.email = user.email || ''
  editForm.name = user.name || ''
  editForm.role = user.role
  editForm.password = ''
  showEditDialog.value = true
}

async function handleUpdateUser() {
  if (!selectedUser.value) return

  isSubmitting.value = true
  error.value = ''

  try {
    await $fetch(`/api/admin/users/${selectedUser.value._id}`, {
      method: 'PATCH',
      body: {
        email: editForm.email || undefined,
        name: editForm.name || undefined,
        role: editForm.role,
        password: editForm.password || undefined,
      },
    })
    showEditDialog.value = false
    selectedUser.value = null
    await fetchUsers()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to update user'
  } finally {
    isSubmitting.value = false
  }
}

function openDeleteDialog(user: User) {
  selectedUser.value = user
  showDeleteDialog.value = true
}

async function handleDeleteUser() {
  if (!selectedUser.value) return

  isSubmitting.value = true
  error.value = ''

  try {
    await $fetch(`/api/admin/users/${selectedUser.value._id}`, {
      method: 'DELETE',
    })
    showDeleteDialog.value = false
    selectedUser.value = null
    await fetchUsers()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to delete user'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/settings')">
        <ArrowLeft class="h-4 w-4" />
      </UiButton>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">User Management</h1>
        <p class="text-muted-foreground">Create and manage user accounts</p>
      </div>
    </div>

    <UiAlert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <UiAlertDescription>{{ error }}</UiAlertDescription>
    </UiAlert>

    <UiCard>
      <UiCardHeader class="flex flex-row items-center justify-between">
        <UiCardTitle>Users</UiCardTitle>
        <UiButton @click="showCreateDialog = true">
          <Plus class="mr-2 h-4 w-4" />
          Add User
        </UiButton>
      </UiCardHeader>
      <UiCardContent>
        <div v-if="isLoading" class="space-y-4">
          <UiSkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
        </div>

        <UiTable v-else-if="users.length > 0">
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>Username</UiTableHead>
              <UiTableHead>Name</UiTableHead>
              <UiTableHead>Email</UiTableHead>
              <UiTableHead>Role</UiTableHead>
              <UiTableHead class="w-24">Actions</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="u in users" :key="u._id">
              <UiTableCell class="font-medium">{{ u.username }}</UiTableCell>
              <UiTableCell>{{ u.name || '-' }}</UiTableCell>
              <UiTableCell>{{ u.email || '-' }}</UiTableCell>
              <UiTableCell>
                <UiBadge :variant="u.role === 'admin' ? 'default' : 'secondary'">
                  {{ u.role }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <div class="flex gap-2">
                  <UiButton variant="ghost" size="icon" @click="openEditDialog(u)">
                    <Pencil class="h-4 w-4" />
                  </UiButton>
                  <UiButton variant="ghost" size="icon" @click="openDeleteDialog(u)">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>

        <div v-else class="text-center py-8 text-muted-foreground">
          No users found
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Create User Dialog -->
    <UiDialog
      v-model:open="showCreateDialog"
      title="Create User"
      description="Add a new user to the system"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <UiLabel for="create-username">Username</UiLabel>
          <UiInput
            id="create-username"
            v-model="createForm.username"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="create-password">Password</UiLabel>
          <UiInput
            id="create-password"
            v-model="createForm.password"
            type="password"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="create-name">Name</UiLabel>
          <UiInput
            id="create-name"
            v-model="createForm.name"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="create-email">Email</UiLabel>
          <UiInput
            id="create-email"
            v-model="createForm.email"
            type="email"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="create-role">Role</UiLabel>
          <UiSelect
            id="create-role"
            v-model="createForm.role"
            :options="roleOptions"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <UiButton variant="outline" @click="showCreateDialog = false">
            Cancel
          </UiButton>
          <UiButton :disabled="isSubmitting" @click="handleCreateUser">
            <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
            Create
          </UiButton>
        </div>
      </div>
    </UiDialog>

    <!-- Edit User Dialog -->
    <UiDialog
      v-model:open="showEditDialog"
      title="Edit User"
      description="Update user information"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <UiLabel for="edit-name">Name</UiLabel>
          <UiInput
            id="edit-name"
            v-model="editForm.name"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="edit-email">Email</UiLabel>
          <UiInput
            id="edit-email"
            v-model="editForm.email"
            type="email"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="edit-role">Role</UiLabel>
          <UiSelect
            id="edit-role"
            v-model="editForm.role"
            :options="roleOptions"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="edit-password">New Password (leave empty to keep current)</UiLabel>
          <UiInput
            id="edit-password"
            v-model="editForm.password"
            type="password"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <UiButton variant="outline" @click="showEditDialog = false">
            Cancel
          </UiButton>
          <UiButton :disabled="isSubmitting" @click="handleUpdateUser">
            <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
            Save
          </UiButton>
        </div>
      </div>
    </UiDialog>

    <!-- Delete User Dialog -->
    <UiDialog
      v-model:open="showDeleteDialog"
      title="Delete User"
      description="Are you sure you want to delete this user? This action cannot be undone."
    >
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          User <strong>{{ selectedUser?.username }}</strong> will be permanently deleted.
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UiButton variant="outline" @click="showDeleteDialog = false">
            Cancel
          </UiButton>
          <UiButton variant="destructive" :disabled="isSubmitting" @click="handleDeleteUser">
            <UiSpinner v-if="isSubmitting" size="sm" class="mr-2" />
            Delete
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
