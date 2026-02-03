import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

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
