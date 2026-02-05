// RFC 9728: OAuth 2.0 Protected Resource Metadata
// Provides metadata about this protected resource for MCP OAuth discovery
export default defineEventHandler((event) => {
  // Set CORS headers for MCP client discovery
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600',
  })

  const url = getRequestURL(event)
  const baseUrl = `${url.protocol}//${url.host}`

  return {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [
      `${baseUrl}/.well-known/oauth-authorization-server`,
      baseUrl,
    ],
    scopes_supported: ['openid', 'profile', 'mcp'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}`,
  }
})
