import { getDynamicsClient } from '../../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const caseId = getRouterParam(event, 'id')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  // Fetch from Dynamics
  const { client } = await getDynamicsClient(event)

  try {
    const [activitiesResponse, annotationsResponse] = await Promise.all([
      client.getCaseActivities(caseId),
      client.getCaseAnnotations(caseId),
    ])

    return {
      activities: activitiesResponse.value,
      annotations: annotationsResponse.value,
    }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch activities',
    })
  }
})
