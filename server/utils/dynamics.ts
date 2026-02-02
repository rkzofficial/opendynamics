import type { H3Event } from 'h3'
import { api } from '@convex/_generated/api'
import { getConvexClient } from './convex'
import { requireAuth } from './auth'
import { decryptJson, decrypt, encrypt } from './encryption'
import { DynamicsApiClient, refreshAccessToken } from '../services/dynamics-api'
import type { Id } from '@convex/_generated/dataModel'

export interface DynamicsClientResult {
  client: DynamicsApiClient
  dynamicsUserId?: string
}

export async function getDynamicsClient(event: H3Event, targetUserId?: string): Promise<DynamicsClientResult> {
  const user = await requireAuth(event)
  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // If admin is requesting to view another user's cases
  let effectiveUserId = user._id
  if (targetUserId && user.role === 'admin') {
    effectiveUserId = targetUserId
  } else if (targetUserId && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can view other users\' cases',
    })
  }

  // Get user's tokens
  const tokens = await convex.query(api.tokens.getForUser, { userId: effectiveUserId as Id<'users'> })

  if (!tokens) {
    throw createError({
      statusCode: 401,
      message: 'Not connected to Dynamics CRM',
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

  // Decrypt access token
  let accessToken = decrypt(tokens.accessToken, config.encryptionKey)
  let refreshToken = decrypt(tokens.refreshToken, config.encryptionKey)
  let expiresAt = tokens.expiresAt

  // Check if token is expired or about to expire (5 minute buffer)
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    // Refresh token
    try {
      const tokenResponse = await refreshAccessToken(
        dynamicsConfig.clientId,
        dynamicsConfig.tenantId,
        refreshToken,
        dynamicsConfig.orgUrl
      )

      accessToken = tokenResponse.access_token
      refreshToken = tokenResponse.refresh_token
      expiresAt = Date.now() + tokenResponse.expires_in * 1000

      // Save updated tokens
      const encryptedAccessToken = encrypt(accessToken, config.encryptionKey)
      const encryptedRefreshToken = encrypt(refreshToken, config.encryptionKey)

      await convex.mutation(api.tokens.save, {
        userId: effectiveUserId as Id<'users'>,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        email: tokens.email,
        organizationId: tokens.organizationId,
        dynamicsUserId: tokens.dynamicsUserId,
      })
    } catch {
      throw createError({
        statusCode: 401,
        message: 'Dynamics session expired. Please reconnect.',
      })
    }
  }

  // Create token refresh callback to save updated tokens to database
  const onTokenRefresh = async (newTokens: { accessToken: string; refreshToken: string; expiresAt: number }) => {
    const encryptedAccessToken = encrypt(newTokens.accessToken, config.encryptionKey)
    const encryptedRefreshToken = encrypt(newTokens.refreshToken, config.encryptionKey)

    await convex.mutation(api.tokens.save, {
      userId: effectiveUserId as Id<'users'>,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: newTokens.expiresAt,
      email: tokens.email,
      organizationId: tokens.organizationId,
      dynamicsUserId: tokens.dynamicsUserId,
    })
  }

  const client = new DynamicsApiClient(
    dynamicsConfig,
    {
      accessToken,
      refreshToken,
      expiresAt,
    },
    onTokenRefresh
  )

  return {
    client,
    dynamicsUserId: tokens.dynamicsUserId,
  }
}
