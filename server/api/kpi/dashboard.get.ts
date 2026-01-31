import { getDynamicsClient } from '../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const dynamics = await getDynamicsClient(event)
  const query = getQuery(event)
  const type = query.type as string | undefined

  try {
    if (type === 'kpis') {
      const kpis = await dynamics.getDashboardKPIs()
      return kpis
    }

    const stats = await dynamics.getDashboardStats()
    return stats
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch dashboard data',
    })
  }
})
