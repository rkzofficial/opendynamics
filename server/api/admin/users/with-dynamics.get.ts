import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const convex = getConvexClient()

  try {
    const users = await convex.query(api.tokens.getUsersWithTokens)
    return users
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch users with Dynamics connections',
    })
  }
})
