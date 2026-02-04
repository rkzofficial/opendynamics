import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

// Generate secure random token
function generateToken(prefix: string): string {
  const bytes = new Uint8Array(30) // 30 bytes = 40 chars in base64
  crypto.getRandomValues(bytes)
  const random = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${prefix}${random}`
}

// PKCE S256 verification
async function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  const computed = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return computed === codeChallenge
}

// OAuth Token endpoint
// Supports grant_type: authorization_code, refresh_token
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const grantType = body.grant_type
  const convex = getConvexClient()

  // Handle authorization_code grant
  if (grantType === 'authorization_code') {
    const code = body.code
    const redirectUri = body.redirect_uri
    const clientId = body.client_id
    const codeVerifier = body.code_verifier

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      }
    }

    // Get the auth code
    const authCode = await convex.query(api.oauth.getAuthCode, { code })

    if (!authCode) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      }
    }

    // Verify code not used
    if (authCode.used) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'Authorization code has already been used',
      }
    }

    // Verify code not expired
    if (authCode.expiresAt < Date.now()) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'Authorization code has expired',
      }
    }

    // Verify client_id matches
    if (authCode.clientId !== clientId) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'client_id does not match',
      }
    }

    // Verify redirect_uri matches
    if (authCode.redirectUri !== redirectUri) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'redirect_uri does not match',
      }
    }

    // Verify PKCE code_verifier
    const isValidChallenge = await verifyCodeChallenge(codeVerifier, authCode.codeChallenge)
    if (!isValidChallenge) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: 'Invalid code_verifier',
      }
    }

    // Mark code as used
    await convex.mutation(api.oauth.markCodeUsed, { code })

    // Generate tokens
    const accessToken = generateToken('oat_')
    const refreshToken = generateToken('ort_')

    // Store tokens
    const result = await convex.mutation(api.oauth.createTokens, {
      accessToken,
      refreshToken,
      clientId,
      userId: authCode.userId,
      scope: authCode.scope,
    })

    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
      scope: authCode.scope,
    }
  }

  // Handle refresh_token grant
  if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token

    if (!refreshToken) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_request',
        error_description: 'refresh_token is required',
      }
    }

    // Generate new tokens
    const newAccessToken = generateToken('oat_')
    const newRefreshToken = generateToken('ort_')

    // Refresh in database
    const result = await convex.mutation(api.oauth.refreshAccessToken, {
      refreshToken,
      newAccessToken,
      newRefreshToken,
    })

    if (!result.success) {
      setResponseStatus(event, 400)
      return {
        error: 'invalid_grant',
        error_description: result.error ?? 'Invalid refresh token',
      }
    }

    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
    }
  }

  // Unsupported grant type
  setResponseStatus(event, 400)
  return {
    error: 'unsupported_grant_type',
    error_description: 'Only authorization_code and refresh_token grant types are supported',
  }
})
