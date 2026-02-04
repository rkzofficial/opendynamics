import type { H3Event } from 'h3'
import { createHash } from 'crypto'
import { requireAuth, type AuthUser } from './auth'

/**
 * Creates a filesystem-safe cache key by hashing complex parts.
 * Keeps the prefix readable for debugging but hashes the rest.
 */
function toSafeCacheKey(key: string): string {
  // Split into prefix and rest (e.g., "cases:userId:..." -> prefix="cases", rest="userId:...")
  const colonIndex = key.indexOf(':')
  if (colonIndex === -1) {
    return key
  }
  
  const prefix = key.substring(0, colonIndex)
  const rest = key.substring(colonIndex + 1)
  
  // Hash the rest to make it filesystem-safe
  const hash = createHash('sha256').update(rest).digest('hex').substring(0, 16)
  return `${prefix}:${hash}`
}

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

// ============================================================================
// Authentication-Aware Caching
// ============================================================================
// NOTE: Nuxt's defineCachedEventHandler cannot be used for authenticated routes
// because it strips cookies from the event object. This utility provides caching
// that authenticates first, then caches per-user responses.

export interface CachedAuthHandlerOptions<T> {
  /** Cache TTL in seconds */
  maxAge: number
  /** Custom cache key generator (defaults to userId:path:query) */
  getKey?: (event: H3Event, user: AuthUser) => string
}

interface CacheEntry<T> {
  data: T
  expires: number
}

/**
 * Creates an event handler with authentication-aware caching.
 * 
 * Unlike defineCachedEventHandler, this:
 * 1. Authenticates first (preserving cookies)
 * 2. Generates user-specific cache keys
 * 3. Caches responses per-user to prevent data leakage
 * 
 * @example
 * export default cachedAuthHandler(async (event, user) => {
 *   return await fetchData()
 * }, {
 *   maxAge: 60 * 5, // 5 minutes
 *   getKey: (event, user) => `my-data:${user._id}`
 * })
 */
export function cachedAuthHandler<T>(
  handler: (event: H3Event, user: AuthUser) => Promise<T>,
  options: CachedAuthHandlerOptions<T>
) {
  return defineEventHandler(async (event) => {
    // 1. Authenticate first (cookies are preserved with defineEventHandler)
    const user = await requireAuth(event)
    
    // 2. Check for cache bypass (force refresh)
    const query = getQuery(event)
    const bypassCache = query._noCache === 'true' || query._noCache === '1'
    
    // 3. Generate user-specific cache key and make it filesystem-safe
    // Remove _noCache from the key so it doesn't affect cache lookups
    const queryForKey = { ...query }
    delete queryForKey._noCache
    const rawKey = options.getKey?.(event, user) 
      ?? `${user._id}:${event.path}:${JSON.stringify(queryForKey)}`
    const cacheKey = toSafeCacheKey(rawKey)
    
    const storage = useStorage('cache')
    
    // 4. Check cache for existing valid entry (unless bypassing)
    if (!bypassCache) {
      const cached = await storage.getItem<CacheEntry<T>>(cacheKey)
      
      if (cached && cached.expires > Date.now()) {
        return cached.data
      }
    }
    
    // 5. Execute handler and cache the result
    const result = await handler(event, user)
    
    await storage.setItem(cacheKey, {
      data: result,
      expires: Date.now() + options.maxAge * 1000
    })
    
    return result
  })
}
