import { api } from '../../../convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session')

  if (!sessionToken) {
    return { user: null }
  }

  const convex = getConvexClient()
  const user = await convex.query(api.auth.validateSession, { token: sessionToken })

  if (!user) {
    // Clear invalid session cookie
    deleteCookie(event, 'session', {
      path: '/',
    })
    return { user: null }
  }

  return {
    user: {
      ...user,
      sessionToken,
    },
  }
})
