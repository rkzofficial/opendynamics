import { api } from '../../../../convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import { decryptJson } from '../../../utils/encryption'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  const setting = await convex.query(api.settings.get, { key: 'oidc' })

  if (!setting) {
    return {
      enabled: false,
      issuerUrl: '',
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email'],
    }
  }

  try {
    const decrypted = decryptJson<{
      enabled: boolean
      issuerUrl?: string
      clientId?: string
      clientSecret?: string
      scopes?: string[]
    }>(setting.value, config.encryptionKey)

    return {
      ...decrypted,
      // Mask the client secret
      clientSecret: decrypted.clientSecret ? '••••••••' : '',
    }
  } catch {
    return {
      enabled: false,
      issuerUrl: '',
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email'],
    }
  }
})
