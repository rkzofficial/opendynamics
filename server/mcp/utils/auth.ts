import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

// Validate OAuth access token (oat_ prefix)
export async function validateOAuthToken(token: string): Promise<string> {
  if (!token || !token.startsWith('oat_')) {
    throw createError({
      statusCode: 401,
      message: 'Invalid OAuth token format',
    })
  }

  const convex = getConvexClient()
  const tokenRecord = await convex.query(api.oauth.getTokenByAccessToken, { accessToken: token })

  if (!tokenRecord) {
    throw createError({
      statusCode: 401,
      message: 'Invalid OAuth token',
    })
  }

  if (tokenRecord.isRevoked) {
    throw createError({
      statusCode: 401,
      message: 'OAuth token has been revoked',
    })
  }

  if (tokenRecord.accessTokenExpiresAt < Date.now()) {
    throw createError({
      statusCode: 401,
      message: 'OAuth token has expired',
    })
  }

  return tokenRecord.userId
}

// Validate API key (odk_ prefix)
export async function validateApiKey(apiKey: string): Promise<string> {
  if (!apiKey || !apiKey.startsWith('odk_')) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API key format',
    })
  }

  // Extract prefix (first 12 chars)
  const prefix = apiKey.substring(0, 12)
  const convex = getConvexClient()

  const keyRecord = await convex.query(api.apiKeys.getByPrefix, { prefix })

  if (!keyRecord) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API key',
    })
  }

  if (keyRecord.isRevoked) {
    throw createError({
      statusCode: 401,
      message: 'API key has been revoked',
    })
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < Date.now()) {
    throw createError({
      statusCode: 401,
      message: 'API key has expired',
    })
  }

  const isValid = await bcrypt.compare(apiKey, keyRecord.keyHash)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API key',
    })
  }

  // Record usage asynchronously (don't await)
  convex.mutation(api.apiKeys.recordUsage, { keyId: keyRecord._id }).catch(() => {
    // Ignore errors from usage recording
  })

  return keyRecord.userId
}

// Validate either API key (odk_) or OAuth token (oat_)
// Returns user ID on success
export async function validateAuth(authHeader: string | undefined): Promise<string> {
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      message: 'Authorization header required',
    })
  }

  // Extract token from "Bearer <token>" or use raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // Route to appropriate validator based on prefix
  if (token.startsWith('oat_')) {
    return validateOAuthToken(token)
  } else if (token.startsWith('odk_')) {
    return validateApiKey(token)
  }

  throw createError({
    statusCode: 401,
    message: 'Invalid token format. Expected oat_ (OAuth) or odk_ (API key) prefix',
  })
}
