import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import { decryptJson } from '../../utils/encryption'
import { startDeviceCodeFlow } from '../../services/dynamics-api'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Administrators cannot connect Dynamics accounts',
    })
  }

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // Get Dynamics config
  const setting = await convex.query(api.settings.get, { key: 'dynamics' })

  if (!setting) {
    throw createError({
      statusCode: 400,
      message: 'Dynamics CRM is not configured. Please configure it in Settings.',
    })
  }

  let dynamicsConfig: { clientId: string; tenantId: string; orgUrl: string }
  try {
    dynamicsConfig = decryptJson(setting.value, config.encryptionKey)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid Dynamics configuration',
    })
  }

  if (!dynamicsConfig.tenantId || !dynamicsConfig.orgUrl) {
    throw createError({
      statusCode: 400,
      message: 'Dynamics CRM configuration is incomplete. Please configure Tenant ID and Organization URL.',
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
