import { createHash } from 'crypto'
import { getDynamicsClient } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import { getEffectiveUserIdFromEvent } from '../../utils/cache'

const CACHE_MAX_AGE = 300 // 5 minutes in seconds

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  console.log('env', JSON.stringify(process.env, null, 2))

  // Generate cache key with hashed query params (avoids invalid filesystem chars)
  const effectiveUserId = getEffectiveUserIdFromEvent(event)
  const queryHash = createHash('sha256').update(JSON.stringify(query)).digest('hex').slice(0, 16)
  const cacheKey = `${effectiveUserId}:cases:list:${queryHash}`
  
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
  const { client, dynamicsUserId } = await getDynamicsClient(event, userId)
  const status = query.status as string | undefined
  const priority = query.priority as string | undefined
  const search = query.search as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined
  const skipToken = query.skipToken as string | undefined
  const pageSize = parseInt(query.pageSize as string) || 20
  const orderBy = query.orderBy as string || 'createdon'
  const orderDirection = query.orderDirection as string || 'desc'

  const filter = buildCaseFilter({ status, priority, search, dateFrom, dateTo })

  try {
    const response = await client.getCases({
      filter: filter || undefined,
      orderby: `${orderBy} ${orderDirection}`,
      top: pageSize,
      skipToken,
    }, dynamicsUserId)

    const result = {
      cases: response.value,
      skipToken: response.nextSkipToken,
      hasMore: !!response.nextSkipToken,
      pageSize,
    }
    
    // Store in cache
    await storage.setItem(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch cases',
    })
  }
})
