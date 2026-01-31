import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import { encryptJson, decryptJson } from '../../../utils/encryption'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody(event)
  const { enabled, issuerUrl, clientId, clientSecret, scopes } = body

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  // Get existing setting to preserve client secret if masked
  let existingSecret = ''
  const existingSetting = await convex.query(api.settings.get, { key: 'oidc' })
  if (existingSetting) {
    try {
      const decrypted = decryptJson<{ clientSecret?: string }>(existingSetting.value, config.encryptionKey)
      existingSecret = decrypted.clientSecret || ''
    } catch {
      // Ignore decryption errors
    }
  }

  const oidcConfig = {
    enabled: !!enabled,
    issuerUrl: issuerUrl || '',
    clientId: clientId || '',
    clientSecret: clientSecret === '••••••••' ? existingSecret : (clientSecret || ''),
    scopes: scopes || ['openid', 'profile', 'email'],
  }

  const encrypted = encryptJson(oidcConfig, config.encryptionKey)

  await convex.mutation(api.settings.set, {
    key: 'oidc',
    value: encrypted,
    updatedBy: user._id as Id<'users'>,
  })

  return { success: true }
})
