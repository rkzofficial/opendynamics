import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import { cachedAuthHandler } from '../../utils/cache'
import { mapCaseToListItem, mapBatchSLA } from '../../utils/mappers'

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

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

    const rawCases = response.value as any[]

    // Identify in-progress cases (statuscode === 1) for SLA fetch
    const inProgressCaseIds = rawCases
      .filter((c: any) => c.statuscode === 1)
      .map((c: any) => c.incidentid)

    // Fetch SLA data for in-progress cases
    let slaData: Record<string, any> = {}
    if (inProgressCaseIds.length > 0) {
      try {
        const rawSLA = await client.getBatchCaseSLAKPIs(inProgressCaseIds)
        slaData = mapBatchSLA(rawSLA)
      } catch {
        // Silent fail for SLA data - cases still display without it
      }
    }

    // Map cases with embedded SLA data
    const cases = rawCases.map((c: any) => {
      const caseId = c.incidentid
      const sla = slaData[caseId.toLowerCase()]
      return mapCaseToListItem(c, sla)
    })

    return {
      cases,
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
  maxAge: 60 * 5,
  getKey: (event, user) => {
    const query = getQuery(event)
    return `cases:${user._id}:${JSON.stringify(query)}`
  }
})
