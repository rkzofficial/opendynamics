import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

// OAuth Authorization initiation endpoint
// Validates params and redirects to consent page
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const clientId = query.client_id as string
  const redirectUri = query.redirect_uri as string
  const responseType = query.response_type as string
  const scope = (query.scope as string) ?? 'mcp'
  const state = query.state as string
  const codeChallenge = query.code_challenge as string
  const codeChallengeMethod = query.code_challenge_method as string

  // Validate required parameters
  if (!clientId) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'client_id is required',
    }))
  }

  if (!redirectUri) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'redirect_uri is required',
    }))
  }

  if (responseType !== 'code') {
    return sendError(event, createError({
      statusCode: 400,
      message: 'response_type must be "code"',
    }))
  }

  // PKCE is mandatory for ChatGPT
  if (!codeChallenge) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'code_challenge is required (PKCE is mandatory)',
    }))
  }

  if (codeChallengeMethod !== 'S256') {
    return sendError(event, createError({
      statusCode: 400,
      message: 'code_challenge_method must be "S256"',
    }))
  }

  // Validate client_id format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(clientId)) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'client_id must be a valid UUID',
    }))
  }

  // Validate redirect_uri
  const allowedPatterns = [
    /^https:\/\/chatgpt\.com\/oauth\/callback$/,
    /^https:\/\/chat\.openai\.com\/oauth\/callback$/,
    /^https:\/\/chatgpt\.com\/connector_platform_oauth_redirect$/,
    /^https?:\/\/localhost(:\d+)?\/.*$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?\/.*$/,
    /^[a-z][a-z0-9+.-]*:\/\/[^\/]+\/.*$/, // Allow custom URI schemes (cursor://, vscode://, etc.) for MCP clients
  ]

  const isAllowedUri = allowedPatterns.some((pattern) => pattern.test(redirectUri))
  if (!isAllowedUri) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'Invalid redirect_uri',
    }))
  }

  // Check if client is registered (optional - ChatGPT may use DCR or not)
  const convex = getConvexClient()
  const client = await convex.query(api.oauth.getClient, { clientId })

  // If client is registered, verify redirect_uri matches
  if (client && !client.redirectUris.includes(redirectUri)) {
    return sendError(event, createError({
      statusCode: 400,
      message: 'redirect_uri does not match registered URIs',
    }))
  }

  // Redirect to consent page with all OAuth params
  const consentUrl = new URL('/oauth/authorize', getRequestURL(event).origin)
  consentUrl.searchParams.set('client_id', clientId)
  consentUrl.searchParams.set('redirect_uri', redirectUri)
  consentUrl.searchParams.set('response_type', responseType)
  consentUrl.searchParams.set('scope', scope)
  consentUrl.searchParams.set('code_challenge', codeChallenge)
  consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (state) {
    consentUrl.searchParams.set('state', state)
  }
  if (client) {
    consentUrl.searchParams.set('client_name', client.clientName)
  }

  return sendRedirect(event, consentUrl.toString())
})
