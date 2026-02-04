import { getDynamicsClient } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  // Fetch from Dynamics
  const { client, dynamicsUserId } = await getDynamicsClient(event, userId)
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
  getKey: (event) => {
    const query = getQuery(event)
    // Create a cache key that includes all query parameters to ensure proper cache separation
    const keyParts = [
      'cases',
      query.userId || 'default',
      query.status || 'all',
      query.statusReason || 'all',
      query.priority || 'all',
      query.dxPendingRelease || 'false',
      query.search || 'none',
      query.dateFrom || 'none',
      query.dateTo || 'none',
      query.skipToken || 'first',
      query.pageSize || '20',
      query.orderBy || 'createdon',
      query.orderDirection || 'desc',
    ]
    return keyParts.join(':')
  },
})
