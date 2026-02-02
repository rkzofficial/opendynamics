import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import { decryptJson, decrypt, encrypt } from '../../utils/encryption'
import { refreshAccessToken } from '../../services/dynamics-api'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // Get user's tokens
  const tokens = await convex.query(api.tokens.getForUser, { userId: user._id as Id<'users'> })

  if (!tokens) {
    throw createError({
      statusCode: 400,
      message: 'No Dynamics connection found',
    })
  }

  // Get Dynamics config
  const setting = await convex.query(api.settings.get, { key: 'dynamics' })

  if (!setting) {
    throw createError({
      statusCode: 400,
      message: 'Dynamics CRM is not configured',
    })
  }

  const dynamicsConfig = decryptJson<{ clientId: string; tenantId: string; orgUrl: string }>(
    setting.value,
    config.encryptionKey
  )

  try {
    // Decrypt refresh token
    const refreshToken = decrypt(tokens.refreshToken, config.encryptionKey)

    // Refresh tokens
    const tokenResponse = await refreshAccessToken(
      dynamicsConfig.clientId,
      dynamicsConfig.tenantId,
      refreshToken,
      dynamicsConfig.orgUrl
    )

    // Calculate expiration
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000

    // Encrypt new tokens
    const encryptedAccessToken = encrypt(tokenResponse.access_token, config.encryptionKey)
    const encryptedRefreshToken = encrypt(tokenResponse.refresh_token, config.encryptionKey)

    // Save updated tokens
    await convex.mutation(api.tokens.save, {
      userId: user._id as Id<'users'>,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      email: tokens.email,
      organizationId: tokens.organizationId,
    })

    return { success: true, expiresAt }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to refresh token',
    })
  }
})
