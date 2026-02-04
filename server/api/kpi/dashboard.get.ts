import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { cachedAuthHandler } from '../../utils/cache'

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const type = query.type as string | undefined
  const userId = query.userId as string | undefined

  // User is already authenticated by cachedAuthHandler
  const { client, dynamicsUserId } = await getDynamicsClientWithUser(user, userId)

  try {
    if (type === 'kpis') {
      return await client.getDashboardKPIs(dynamicsUserId)
    } else {
      return await client.getDashboardStats(dynamicsUserId)
    }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch dashboard data',
    })
  }
}, {
  maxAge: 60 * 5, // Cache for 5 minutes
  getKey: (event, user) => {
    const query = getQuery(event)
    const type = query.type as string | undefined
    const userId = query.userId as string | undefined
    return `dashboard:${user._id}:${type || 'stats'}:${userId || 'self'}`
  }
})
