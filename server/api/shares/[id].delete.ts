import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const shareId = getRouterParam(event, 'id')

  if (!shareId) {
    throw createError({
      statusCode: 400,
      message: 'Share ID is required',
    })
  }

  const convex = getConvexClient()

  try {
    const result = await convex.mutation(api.caseShares.revoke, {
      shareId: shareId as Id<'caseShares'>,
      userId: user._id as Id<'users'>,
    })

    if (!result.success) {
      throw createError({
        statusCode: 403,
        message: result.error || 'Failed to revoke share',
      })
    }

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to revoke share',
    })
  }
})
