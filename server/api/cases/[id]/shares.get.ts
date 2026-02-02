import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAuth } from '../../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const caseId = getRouterParam(event, 'id')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  const convex = getConvexClient()

  try {
    const shares = await convex.query(api.caseShares.getForCase, {
      caseId,
      userId: user._id as Id<'users'>,
    })

    return shares
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch shares',
    })
  }
})
