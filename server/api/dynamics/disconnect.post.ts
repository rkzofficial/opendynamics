import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Administrators cannot connect Dynamics accounts',
    })
  }

  const convex = getConvexClient()
  await convex.mutation(api.tokens.remove, { userId: user._id as Id<'users'> })

  return { success: true }
})
