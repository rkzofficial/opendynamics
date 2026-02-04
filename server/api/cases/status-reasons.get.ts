import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { cachedAuthHandler } from '../../utils/cache'

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  // User is already authenticated by cachedAuthHandler
  const { client } = await getDynamicsClientWithUser(user, userId)

  try {
    return await client.getStatusReasonOptions()
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch status reason options',
    })
  }
}, {
  maxAge: 60 * 60, // Cache for 1 hour - metadata rarely changes
  getKey: (event, user) => {
    const query = getQuery(event)
    const userId = query.userId as string | undefined
    return `status-reasons:${user._id}:${userId || 'self'}`
  }
})
