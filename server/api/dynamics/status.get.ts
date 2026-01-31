import { api } from '../../../convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import { requireAuth } from '../../utils/auth'
import type { Id } from '../../../convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const convex = getConvexClient()
  const status = await convex.query(api.tokens.getConnectionStatus, {
    userId: user._id as Id<'users'>,
  })

  return status
})
