import type { H3Event } from 'h3'
import { api } from '@convex/_generated/api'
import { getConvexClient } from './convex'

export interface AuthUser {
  _id: string
  username: string
  email?: string
  name?: string
  role: 'admin' | 'user'
}

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const sessionToken = getCookie(event, 'session')

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const convex = getConvexClient()
  const user = await convex.query(api.auth.validateSession, { token: sessionToken })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Session expired',
    })
  }

  return user as AuthUser
}

export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }

  return user
}

export async function getOptionalAuth(event: H3Event): Promise<AuthUser | null> {
  const sessionToken = getCookie(event, 'session')

  if (!sessionToken) {
    return null
  }

  try {
    const convex = getConvexClient()
    const user = await convex.query(api.auth.validateSession, { token: sessionToken })
    return user as AuthUser | null
  } catch {
    return null
  }
}
