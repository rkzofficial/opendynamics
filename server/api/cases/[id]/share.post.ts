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

  const body = await readBody<{ expiresInDays?: number }>(event)

  // Calculate expiration time if specified
  let expiresAt: number | undefined
  if (body?.expiresInDays) {
    expiresAt = Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000
  }

  const convex = getConvexClient()

  try {
    const share = await convex.mutation(api.caseShares.create, {
      caseId,
      userId: user._id as Id<'users'>,
      expiresAt,
    })

    return share
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to create share link',
    })
  }
})
