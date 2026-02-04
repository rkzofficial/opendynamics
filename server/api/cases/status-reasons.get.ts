import { getDynamicsClient } from '../../utils/dynamics'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  const { client } = await getDynamicsClient(event, userId)

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
  getKey: (event) => {
    const query = getQuery(event)
    const userId = query.userId as string | undefined
    return `status-reasons:${userId || 'default'}`
  },
})
