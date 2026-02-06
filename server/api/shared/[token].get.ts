import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { getDynamicsClientForUser } from '../../utils/dynamics'
import { buildCaseDetail } from '../../utils/mappers'

export default defineEventHandler(async (event) => {
  const shareToken = getRouterParam(event, 'token')

  if (!shareToken) {
    throw createError({
      statusCode: 400,
      message: 'Share token is required',
    })
  }

  const convex = getConvexClient()

  // Look up share by token
  const share = await convex.query(api.caseShares.getByToken, { shareToken })

  if (!share) {
    throw createError({
      statusCode: 404,
      message: 'Share link not found',
    })
  }

  if ('error' in share) {
    if (share.error === 'revoked') {
      throw createError({
        statusCode: 410,
        message: 'This share link has been revoked',
      })
    }
    if (share.error === 'expired') {
      throw createError({
        statusCode: 410,
        message: 'This share link has expired',
      })
    }
  }

  // Record the view
  await convex.mutation(api.caseShares.recordView, { shareToken })

  // Get Dynamics client using the share owner's credentials
  const { client } = await getDynamicsClientForUser(share.userId)

  try {
    return await buildCaseDetail(client, share.caseId)
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch case',
    })
  }
})
