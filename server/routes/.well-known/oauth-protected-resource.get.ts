// RFC 9728: OAuth 2.0 Protected Resource Metadata
// Provides metadata about this protected resource for MCP OAuth discovery
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const baseUrl = `${url.protocol}//${url.host}`

  return {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ['openid', 'profile', 'mcp'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}`,
  }
})
