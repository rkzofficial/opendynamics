import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import { encryptJson } from '../../../utils/encryption'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody(event)
  const { clientId, tenantId, orgUrl } = body

  const config = useRuntimeConfig()
  const convex = getConvexClient()

  const dynamicsConfig = {
    clientId: clientId || '51f81489-12ee-4a9e-aaae-a2591f45987d',
    tenantId: tenantId || '',
    orgUrl: orgUrl || '',
  }

  const encrypted = encryptJson(dynamicsConfig, config.encryptionKey)

  await convex.mutation(api.settings.set, {
    key: 'dynamics',
    value: encrypted,
    updatedBy: user._id as Id<'users'>,
  })

  return { success: true }
})
