import type { H3Event } from 'h3'
import { requireAuth } from './auth'

export interface CacheKeyOptions {
  event: H3Event
  prefix?: string
  includeQuery?: boolean
}

export function generateCacheKey(options: CacheKeyOptions): string {
  const { event, prefix = '', includeQuery = true } = options
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  
  // Determine effective user ID (from query for admin views, or from session)
  let effectiveUserId: string
  if (userId) {
    effectiveUserId = userId
  } else {
    // For cache key generation, we use a placeholder since requireAuth is async
    // The actual auth check happens in the handler
    effectiveUserId = 'current-user'
  }
  
  const parts = [effectiveUserId]
  
  if (prefix) {
    parts.push(prefix)
  }
  
  parts.push(event.path)
  
  if (includeQuery) {
    parts.push(JSON.stringify(query))
  }
  
  return parts.join(':')
}

export function generateCacheKeySync(event: H3Event): string {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const effectiveUserId = userId || 'current-user'
  
  return `${effectiveUserId}:${event.path}:${JSON.stringify(query)}`
}

export function getEffectiveUserIdFromEvent(event: H3Event): string {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  
  if (userId) {
    return userId
  }
  
  // Extract user ID from session cookie for cache key generation
  // This avoids the async auth check during cache key generation
  const sessionToken = getCookie(event, 'session')
  if (sessionToken) {
    // Use the session token itself as part of the cache key
    // This ensures each session gets its own cache
    return `session:${sessionToken}`
  }
  
  // Fallback to IP address or anonymous identifier
  // This handles cases where there's no session yet (shouldn't happen for protected routes)
  return 'anonymous'
}

export async function getEffectiveUserId(event: H3Event): Promise<string> {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  
  if (userId) {
    return userId
  }
  
  const user = await requireAuth(event)
  return user._id
}

export async function invalidateCache(event: H3Event, path: string): Promise<void> {
  const storage = useStorage('cache')
  const userId = await getEffectiveUserId(event)
  const cacheKey = `${userId}:${path}`
  
  // Get all cache keys and remove those matching the path
  const keys = await storage.getKeys()
  const keysToRemove = keys.filter(key => key.includes(cacheKey))
  
  await Promise.all(keysToRemove.map(key => storage.removeItem(key)))
}

export async function invalidateCacheByPrefix(event: H3Event, prefix: string): Promise<void> {
  const storage = useStorage('cache')
  const userId = await getEffectiveUserId(event)
  const cacheKeyPrefix = `${userId}:${prefix}`
  
  const keys = await storage.getKeys()
  const keysToRemove = keys.filter(key => key.includes(cacheKeyPrefix))
  
  await Promise.all(keysToRemove.map(key => storage.removeItem(key)))
}
