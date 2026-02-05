import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import type { Id } from '@convex/_generated/dataModel'

// Generate a secure random code
function generateAuthCode(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// OAuth Authorization consent processing endpoint
// User submits consent form, generates auth code and redirects
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
    user_id: userId,
    action, // 'approve' or 'deny'
  } = body

  // If user denies, redirect with error
  if (action === 'deny') {
    const errorUrl = new URL(redirectUri)
    errorUrl.searchParams.set('error', 'access_denied')
    errorUrl.searchParams.set('error_description', 'User denied the authorization request')
    if (state) {
      errorUrl.searchParams.set('state', state)
    }
    return { redirect: errorUrl.toString() }
  }

  // Validate required parameters
  if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod || !userId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters',
    })
  }

  // Generate auth code
  const code = generateAuthCode()

  const convex = getConvexClient()

  // Store the auth code
  await convex.mutation(api.oauth.createAuthCode, {
    code,
    clientId,
    userId: userId as Id<'users'>,
    redirectUri,
    scope: scope ?? 'mcp',
    codeChallenge,
    codeChallengeMethod,
    state,
  })

  // Build redirect URL with code
  const successUrl = new URL(redirectUri)
  successUrl.searchParams.set('code', code)
  if (state) {
    successUrl.searchParams.set('state', state)
  }

  return { redirect: successUrl.toString() }
})
