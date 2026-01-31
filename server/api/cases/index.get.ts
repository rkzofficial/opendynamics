import { getDynamicsClient } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  const { client, dynamicsUserId } = await getDynamicsClient(event, userId)
  const status = query.status as string | undefined
  const priority = query.priority as string | undefined
  const search = query.search as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined
  const skipToken = query.skipToken as string | undefined
  const pageSize = parseInt(query.pageSize as string) || 20
  const orderBy = query.orderBy as string || 'createdon'
  const orderDirection = query.orderDirection as string || 'desc'

  const filter = buildCaseFilter({ status, priority, search, dateFrom, dateTo })

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
})
