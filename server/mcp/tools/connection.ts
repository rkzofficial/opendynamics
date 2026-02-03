import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import type { Id } from '@convex/_generated/dataModel'
import type { McpToolContext, ToolResult } from '../types'

// Tool definitions
export const connectionTools: Tool[] = [
  {
    name: 'get_connection_status',
    description: 'Check the current Dynamics 365 CRM connection status for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// Tool handlers
export async function handleGetConnectionStatus(context: McpToolContext): Promise<ToolResult> {
  try {
    const convex = getConvexClient()

    // Check if user has tokens
    const tokens = await convex.query(api.tokens.getForUser, {
      userId: context.userId as Id<'users'>,
    })

    if (!tokens) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              connected: false,
              message: 'Not connected to Dynamics CRM. Please connect through the web interface.',
            }, null, 2),
          },
        ],
      }
    }

    // Check if token is expired
    const isExpired = tokens.expiresAt < Date.now()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            connected: !isExpired,
            email: tokens.email,
            organizationId: tokens.organizationId,
            expiresAt: tokens.expiresAt,
            isExpired,
            message: isExpired
              ? 'Dynamics CRM session has expired. Token will be refreshed on next API call.'
              : 'Connected to Dynamics CRM',
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error checking connection status: ${(error as Error).message}` }],
      isError: true,
    }
  }
}
