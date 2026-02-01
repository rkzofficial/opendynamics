import { getDynamicsClient } from '../../utils/dynamics'
import { getEffectiveUserIdFromEvent } from '../../utils/cache'

const CACHE_MAX_AGE = 300 // 5 minutes in seconds

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string | undefined
  
  // Generate cache key
  const effectiveUserId = getEffectiveUserIdFromEvent(event)
  const cacheKey = `${effectiveUserId}:dashboard:${type || 'stats'}`
  
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

  try {
    let result
    
    if (type === 'kpis') {
      result = await client.getDashboardKPIs()
    } else {
      result = await client.getDashboardStats()
    }
    
    // Store in cache
    await storage.setItem(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch dashboard data',
    })
  }
})
