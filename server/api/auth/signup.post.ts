import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { decryptJson, encrypt } from '../../utils/encryption'
import { pollDeviceCodeToken, DynamicsApiClient } from '../../services/dynamics-api'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, username, password, deviceCode } = body

  // Validate required fields
  if (!name || !email || !username || !password || !deviceCode) {
    throw createError({
      statusCode: 400,
      message: 'All fields are required',
    })
  }

  // Validate password length
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters',
    })
  }

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // Get Dynamics config
  const setting = await convex.query(api.settings.get, { key: 'dynamics' })

  if (!setting) {
    throw createError({
      statusCode: 400,
      message: 'Dynamics CRM is not configured. Contact an administrator.',
    })
  }

  let dynamicsConfig: { clientId: string; tenantId: string; orgUrl: string }
  try {
    dynamicsConfig = decryptJson(setting.value, config.encryptionKey)
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to decrypt Dynamics configuration. The encryption key may have changed.',
    })
  }

  try {
    // Poll for token
    const tokenResponse = await pollDeviceCodeToken(
      dynamicsConfig.clientId,
      dynamicsConfig.tenantId,
      deviceCode
    )

    // Calculate expiration
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000

    // Create Dynamics client to verify connection
    const dynamicsClient = new DynamicsApiClient(
      dynamicsConfig,
      {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      }
    )

    // Get user info from Dynamics to verify connection
    const whoAmI = await dynamicsClient.whoAmI()

    // Re-check username/email uniqueness (race condition protection)
    const existingUsername = await convex.query(api.auth.getUserByUsername, { username })
    if (existingUsername) {
      throw createError({
        statusCode: 400,
        message: 'Username is already taken',
      })
    }

    const existingEmail = await convex.query(api.auth.getUserByEmail, { email })
    if (existingEmail) {
      throw createError({
        statusCode: 400,
        message: 'Email is already registered',
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user with role 'user' (no admin self-signup)
    const userId = await convex.mutation(api.users.create, {
      username,
      passwordHash,
      email,
      name,
      role: 'user',
    })

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokenResponse.access_token, config.encryptionKey)
    const encryptedRefreshToken = encrypt(tokenResponse.refresh_token, config.encryptionKey)

    // Save Dynamics tokens
    await convex.mutation(api.tokens.save, {
      userId: userId as Id<'users'>,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      organizationId: whoAmI.OrganizationId,
      dynamicsUserId: whoAmI.UserId,
    })

    // Generate session token
    const sessionToken = crypto.randomUUID()
    const sessionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    // Create session
    const sessionUser = await convex.mutation(api.auth.createSession, {
      userId: userId as Id<'users'>,
      sessionToken,
      expiresAt: sessionExpiresAt,
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
  } catch (error: unknown) {
    const err = error as Error

    // Handle authorization pending
    if (err.message === 'authorization_pending') {
      throw createError({
        statusCode: 202,
        message: 'authorization_pending',
      })
    }

    // Handle expired token
    if (err.message.includes('expired_token') || err.message.includes('expired')) {
      throw createError({
        statusCode: 400,
        message: 'expired_token',
      })
    }

    // Handle user denied consent
    if (err.message.includes('authorization_declined') || err.message.includes('declined')) {
      throw createError({
        statusCode: 400,
        message: 'authorization_declined',
      })
    }

    // Re-throw if it's already an error from createError
    if ('statusCode' in err) {
      throw err
    }

    throw createError({
      statusCode: 500,
      message: err.message || 'Signup failed',
    })
  }
})
