import { getDynamicsClient } from '../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const dynamics = await getDynamicsClient(event)
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
