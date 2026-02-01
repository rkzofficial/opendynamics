import { getDynamicsClient } from '../../../utils/dynamics'
import { getEffectiveUserIdFromEvent } from '../../../utils/cache'

const CACHE_MAX_AGE = 300 // 5 minutes in seconds

export default defineEventHandler(async (event) => {
  const caseId = getRouterParam(event, 'id')
  
  // Generate cache key
  const effectiveUserId = getEffectiveUserIdFromEvent(event)
  const cacheKey = `${effectiveUserId}:cases:activities:${caseId}`
  
  // Try to get from cache
  const storage = useStorage('cache')
  const cached = await storage.getItem(cacheKey)
  
  if (cached) {
    const { data, timestamp } = cached as { data: unknown; timestamp: number }
    const age = (Date.now() - timestamp) / 1000
    
    if (age < CACHE_MAX_AGE) {
      return data
    }
  }
  
  // Fetch from Dynamics
  const { client } = await getDynamicsClient(event)

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  try {
    const [activitiesResponse, annotationsResponse] = await Promise.all([
      client.getCaseActivities(caseId),
      client.getCaseAnnotations(caseId),
    ])

    const result = {
      activities: activitiesResponse.value,
      annotations: annotationsResponse.value,
    }
    
    // Store in cache
    await storage.setItem(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch activities',
    })
  }
})
