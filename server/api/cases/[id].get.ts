import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { cachedAuthHandler } from '../../utils/cache'
import { buildCaseDetail } from '../../utils/mappers'

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const caseId = getRouterParam(event, 'id')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  const { client } = await getDynamicsClientWithUser(user, userId)

  try {
    return await buildCaseDetail(client, caseId)
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch case',
    })
  }
}, {
  maxAge: 60 * 5,
  getKey: (event, user) => {
    const caseId = getRouterParam(event, 'id')
    const query = getQuery(event)
    return `case:${user._id}:${caseId}:${query.userId || 'self'}`
  }
})
