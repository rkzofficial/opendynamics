import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required',
    })
  }

  const convex = getConvexClient()

  // Get user by username
  const user = await convex.query(api.auth.getUserByUsername, { username })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash)

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  // Generate session token
  const sessionToken = crypto.randomUUID()
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  // Create session
  const sessionUser = await convex.mutation(api.auth.createSession, {
    userId: user._id,
    sessionToken,
    expiresAt,
  })

  // Set session cookie
  setCookie(event, 'session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })

  return {
    success: true,
    user: {
      ...sessionUser,
      sessionToken,
    },
  }
})
