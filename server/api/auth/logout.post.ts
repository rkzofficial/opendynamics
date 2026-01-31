import { api } from '../../../convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session')

  if (sessionToken) {
    const convex = getConvexClient()
    await convex.mutation(api.auth.logout, { token: sessionToken })
  }

  // Clear session cookie
  deleteCookie(event, 'session', {
    path: '/',
  })

  return { success: true }
})
