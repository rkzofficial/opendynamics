import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'

// Dynamic Client Registration (DCR) endpoint
// ChatGPT sends UUID-format client IDs
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    token_endpoint_auth_method,
  } = body

  // client_id can be provided (ChatGPT DCR) or will be generated
  let clientId = body.client_id

  if (!clientId) {
    clientId = crypto.randomUUID()
  }

  // Validate UUID format for client_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(clientId)) {
    throw createError({
      statusCode: 400,
      message: 'client_id must be a valid UUID',
    })
  }

  if (!client_name) {
    throw createError({
      statusCode: 400,
      message: 'client_name is required',
    })
  }

  if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'redirect_uris is required and must be a non-empty array',
    })
  }

  // Validate redirect URIs - ChatGPT uses specific callback URLs
  const allowedPatterns = [
    /^https:\/\/chatgpt\.com\/oauth\/callback$/,
    /^https:\/\/chat\.openai\.com\/oauth\/callback$/,
    /^https:\/\/chatgpt\.com\/connector_platform_oauth_redirect$/,
    /^https?:\/\/localhost(:\d+)?\/.*$/, // Allow localhost for development
    /^https?:\/\/127\.0\.0\.1(:\d+)?\/.*$/, // Allow 127.0.0.1 for development
  ]

  for (const uri of redirect_uris) {
    const isAllowed = allowedPatterns.some((pattern) => pattern.test(uri))
    if (!isAllowed) {
      throw createError({
        statusCode: 400,
        message: `Invalid redirect_uri: ${uri}`,
      })
    }
  }

  const convex = getConvexClient()

  const result = await convex.mutation(api.oauth.registerClient, {
    clientId,
    clientName: client_name,
    redirectUris: redirect_uris,
    grantTypes: grant_types ?? ['authorization_code', 'refresh_token'],
    responseTypes: response_types ?? ['code'],
    tokenEndpointAuthMethod: token_endpoint_auth_method ?? 'none',
  })

  // Return OAuth 2.0 DCR response format
  return {
    client_id: result.clientId,
    client_name,
    redirect_uris,
    grant_types: grant_types ?? ['authorization_code', 'refresh_token'],
    response_types: response_types ?? ['code'],
    token_endpoint_auth_method: token_endpoint_auth_method ?? 'none',
  }
})
