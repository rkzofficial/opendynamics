import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

// Generate a random API key with format: odk_<32 alphanumeric chars>
function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'odk_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const convex = getConvexClient()

  const { name, expiresInDays } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'API key name is required',
    })
  }

  // Generate the full API key
  const fullKey = generateApiKey()

  // Hash the key for storage
  const keyHash = await bcrypt.hash(fullKey, 10)

  // Extract prefix for lookup (first 12 chars: "odk_" + 8 chars)
  const keyPrefix = fullKey.substring(0, 12)

  // Calculate expiration if provided
  let expiresAt: number | undefined
  if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
    expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  }

  // Create the API key in the database
  const keyId = await convex.mutation(api.apiKeys.create, {
    userId: user._id as Id<'users'>,
    name: name.trim(),
    keyHash,
    keyPrefix,
    expiresAt,
  })

  // Return the full key (only shown once)
  return {
    _id: keyId,
    name: name.trim(),
    key: fullKey,
    keyPrefix,
    createdAt: Date.now(),
    expiresAt,
  }
})
