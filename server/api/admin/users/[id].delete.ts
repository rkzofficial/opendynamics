import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAdmin(event)

  const userId = getRouterParam(event, 'id') as Id<'users'>

  // Prevent self-deletion
  if (userId === currentUser._id) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete your own account',
    })
  }

  const convex = getConvexClient()

  try {
    await convex.mutation(api.users.remove, { userId })
    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 400,
      message: err.message || 'Failed to delete user',
    })
  }
})
