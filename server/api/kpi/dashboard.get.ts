import { getDynamicsClient } from '../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string | undefined
  const userId = query.userId as string | undefined

  // Fetch from Dynamics
  const { client, dynamicsUserId } = await getDynamicsClient(event, userId)

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
})
