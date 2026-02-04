import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import { cachedAuthHandler } from '../../utils/cache'

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  // User is already authenticated by cachedAuthHandler
  const { client, dynamicsUserId } = await getDynamicsClientWithUser(user, userId)
  const status = query.status as string | undefined
  const statusReason = query.statusReason as string | undefined
  const priority = query.priority as string | undefined
  const dxPendingRelease = query.dxPendingRelease === 'true'
  const search = query.search as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined
  const skipToken = query.skipToken as string | undefined
  const pageSize = parseInt(query.pageSize as string) || 20
  const orderBy = query.orderBy as string || 'createdon'
  const orderDirection = query.orderDirection as string || 'desc'

  const filter = buildCaseFilter({ status, statusReason, priority, dxPendingRelease, search, dateFrom, dateTo })

  try {
    const response = await client.getCases({
      filter: filter || undefined,
      orderby: `${orderBy} ${orderDirection}`,
      top: pageSize,
      skipToken,
    }, dynamicsUserId)

    return {
      cases: response.value,
      skipToken: response.nextSkipToken,
      hasMore: !!response.nextSkipToken,
      pageSize,
    }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch cases',
    })
  }
}, {
  maxAge: 60 * 5, // Cache for 5 minutes
  getKey: (event, user) => {
    const query = getQuery(event)
    // Include all query params in cache key to separate different filter combinations
    return `cases:${user._id}:${JSON.stringify(query)}`
  }
})
