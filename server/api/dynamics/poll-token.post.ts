import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import { decryptJson, encrypt } from '../../utils/encryption'
import { pollDeviceCodeToken, DynamicsApiClient } from '../../services/dynamics-api'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Administrators cannot connect Dynamics accounts',
    })
  }

  const body = await readBody(event)
  const { deviceCode } = body

  if (!deviceCode) {
    throw createError({
      statusCode: 400,
      message: 'Device code is required',
    })
  }

  const config = useRuntimeConfig()
  const convex = getConvexClient()

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
    const tokenResponse = await pollDeviceCodeToken(
      dynamicsConfig.clientId,
      dynamicsConfig.tenantId,
      deviceCode
    )

    // Calculate expiration
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000

    // Create Dynamics client to get user info
    const dynamicsClient = new DynamicsApiClient(
      dynamicsConfig,
      {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      }
    )

    // Get user info from Dynamics
    const whoAmI = await dynamicsClient.whoAmI()

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokenResponse.access_token, config.encryptionKey)
    const encryptedRefreshToken = encrypt(tokenResponse.refresh_token, config.encryptionKey)

    // Save tokens to Convex
    await convex.mutation(api.tokens.save, {
      userId: user._id as Id<'users'>,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      organizationId: whoAmI.OrganizationId,
      dynamicsUserId: whoAmI.UserId,
    })

    return {
      success: true,
      status: {
        connected: true,
        organizationId: whoAmI.OrganizationId,
        expiresAt,
      },
    }
  } catch (error: unknown) {
    const err = error as Error
    if (err.message === 'authorization_pending') {
      throw createError({
        statusCode: 202,
        message: 'authorization_pending',
      })
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to get token',
    })
  }
})
