import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '../mcp/server'
import { validateApiKey } from '../mcp/utils/auth'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // Handle OPTIONS for CORS preflight
  if (method === 'OPTIONS') {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
      'Access-Control-Max-Age': '86400',
    })
    return null
  }

  // Set CORS headers for all responses
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
  })

  // Only allow POST, GET, DELETE methods for MCP
  if (method !== 'POST' && method !== 'GET' && method !== 'DELETE') {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed',
    })
  }

  // Extract API key from Authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Missing or invalid Authorization header. Expected: Bearer <api-key>',
    })
  }

  const apiKey = authHeader.slice(7)
  let userId: string

  try {
    userId = await validateApiKey(apiKey)
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: (error as Error).message || 'Invalid API key',
    })
  }

  // Create MCP server with user context
  const server = createMcpServer(userId)

  // Create stateless transport (new instance per request)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true,
  })

  // Handle cleanup on connection close
  event.node.res.on('close', () => {
    transport.close()
    server.close()
  })

  try {
    // Connect server to transport
    await server.connect(transport)

    // Get request body for POST requests
    let body: unknown = undefined
    if (method === 'POST') {
      body = await readBody(event)
    }

    // Handle the MCP request
    // The transport will write directly to the response
    await transport.handleRequest(
      event.node.req,
      event.node.res,
      body
    )

    // The response is handled by the transport, so we don't return anything
    // Return undefined to signal that the response was already sent
    return undefined
  } catch (error) {
    // If response hasn't been sent yet, throw error
    if (!event.node.res.headersSent) {
      throw createError({
        statusCode: 500,
        message: (error as Error).message || 'MCP request failed',
      })
    }
    // If headers already sent, log and close
    console.error('MCP error after headers sent:', error)
  }
})
