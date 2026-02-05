import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { decryptJson } from '../../../utils/encryption'
import { startDeviceCodeFlow } from '../../../services/dynamics-api'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, username } = body

  // Validate required fields
  if (!name || !email || !username) {
    throw createError({
      statusCode: 400,
      message: 'Name, email, and username are required',
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Please enter a valid email address',
    })
  }

  // Validate username length
  if (username.length < 3) {
    throw createError({
      statusCode: 400,
      message: 'Username must be at least 3 characters',
    })
  }

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // Check if username is already taken
  const existingUsername = await convex.query(api.auth.getUserByUsername, { username })
  if (existingUsername) {
    throw createError({
      statusCode: 400,
      message: 'Username is already taken',
    })
  }

  // Check if email is already registered
  const existingEmail = await convex.query(api.auth.getUserByEmail, { email })
  if (existingEmail) {
    throw createError({
      statusCode: 400,
      message: 'Email is already registered',
    })
  }

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
    const deviceCodeResponse = await startDeviceCodeFlow(
      dynamicsConfig.clientId,
      dynamicsConfig.tenantId,
      dynamicsConfig.orgUrl
    )

    return deviceCodeResponse
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to start device code flow',
    })
  }
})
