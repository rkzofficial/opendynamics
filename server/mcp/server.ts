import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { registerAllTools, handleToolCall, getToolDefinitions } from './tools'
import type { McpToolContext } from './types'

export function createMcpServer(userId: string): Server {
  const server = new Server(
    {
      name: 'opendynamics',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  const context: McpToolContext = { userId }

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getToolDefinitions(),
    }
  })

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    return handleToolCall(name, args || {}, context)
  })

  return server
}
