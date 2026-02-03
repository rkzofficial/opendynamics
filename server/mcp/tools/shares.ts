import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../utils/convex'
import type { Id } from '@convex/_generated/dataModel'
import type { McpToolContext, ToolResult, CreateShareArgs, ListSharesArgs, RevokeShareArgs } from '../types'

// Tool definitions
export const shareTools: Tool[] = [
  {
    name: 'create_share',
    description: 'Create a shareable link for a case that can be accessed without authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID to share',
        },
        expiresInDays: {
          type: 'number',
          description: 'Number of days until the share link expires (optional)',
        },
      },
      required: ['caseId'],
    },
  },
  {
    name: 'list_shares',
    description: 'List all active share links for a specific case.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID to list shares for',
        },
      },
      required: ['caseId'],
    },
  },
  {
    name: 'revoke_share',
    description: 'Revoke a share link, making it no longer accessible.',
    inputSchema: {
      type: 'object',
      properties: {
        shareId: {
          type: 'string',
          description: 'The share ID to revoke',
        },
      },
      required: ['shareId'],
    },
  },
]

// Tool handlers
export async function handleCreateShare(args: CreateShareArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    const convex = getConvexClient()

    let expiresAt: number | undefined
    if (args.expiresInDays && args.expiresInDays > 0) {
      expiresAt = Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
    }

    const share = await convex.mutation(api.caseShares.create, {
      caseId: args.caseId,
      userId: context.userId as Id<'users'>,
      expiresAt,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            share: {
              id: share?._id,
              shareToken: share?.shareToken,
              caseId: share?.caseId,
              expiresAt: share?.expiresAt,
              createdAt: share?.createdAt,
            },
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error creating share: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleListShares(args: ListSharesArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    const convex = getConvexClient()

    const shares = await convex.query(api.caseShares.getForCase, {
      caseId: args.caseId,
      userId: context.userId as Id<'users'>,
    })

    const formattedShares = shares.map((s) => ({
      id: s._id,
      shareToken: s.shareToken,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewCount: s.viewCount,
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            shares: formattedShares,
            count: formattedShares.length,
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error listing shares: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleRevokeShare(args: RevokeShareArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.shareId) {
      return {
        content: [{ type: 'text', text: 'Error: shareId is required' }],
        isError: true,
      }
    }

    const convex = getConvexClient()

    const result = await convex.mutation(api.caseShares.revoke, {
      shareId: args.shareId as Id<'caseShares'>,
      userId: context.userId as Id<'users'>,
    })

    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Error: ${result.error}` }],
        isError: true,
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Share revoked successfully' }),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error revoking share: ${(error as Error).message}` }],
      isError: true,
    }
  }
}
