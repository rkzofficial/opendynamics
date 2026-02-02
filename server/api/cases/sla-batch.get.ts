import { getDynamicsClient } from '../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const caseIdsParam = query.caseIds as string | undefined

  if (!caseIdsParam) {
    return { slaData: {} }
  }

  const caseIds = caseIdsParam.split(',').filter(Boolean)

  if (caseIds.length === 0) {
    return { slaData: {} }
  }

  const { client } = await getDynamicsClient(event, userId)

  try {
    const slaData = await client.getBatchCaseSLAKPIs(caseIds)

    return { slaData }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch batch SLA data',
    })
  }
})
