import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import { decryptJson } from '../../../utils/encryption'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  const setting = await convex.query(api.settings.get, { key: 'dynamics' })

  console.log({config})

  if (!setting) {
    return {
      clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
      tenantId: '',
      orgUrl: '',
    }
  }

  try {
    return decryptJson<{
      clientId: string
      tenantId: string
      orgUrl: string
    }>(setting.value, config.encryptionKey)
  } catch {
    return {
      clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
      tenantId: '',
      orgUrl: '',
    }
  }
})
