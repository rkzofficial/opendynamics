import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const convex = getConvexClient()

  const keyId = getRouterParam(event, 'id')

  if (!keyId) {
    throw createError({
      statusCode: 400,
      message: 'API key ID is required',
    })
  }

  const result = await convex.mutation(api.apiKeys.revoke, {
    keyId: keyId as Id<'apiKeys'>,
    userId: user._id as Id<'users'>,
  })

  if (!result.success) {
    throw createError({
      statusCode: 404,
      message: result.error || 'Failed to revoke API key',
    })
  }

  return { success: true }
})
