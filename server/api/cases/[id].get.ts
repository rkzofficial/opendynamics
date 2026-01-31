import { getDynamicsClient } from '../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  const dynamics = await getDynamicsClient(event, userId)
  const caseId = getRouterParam(event, 'id')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  try {
    const caseData = await dynamics.getCase(caseId)
    return caseData
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch case',
    })
  }
})
