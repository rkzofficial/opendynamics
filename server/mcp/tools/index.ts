import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { McpToolContext, ToolResult } from '../types'

// Import tool definitions and handlers
import {
  caseTools,
  handleListCases,
  handleGetCase,
  handleAddInternalNote,
  handleAddExternalNote,
} from './cases'
import {
  dashboardTools,
  handleGetDashboardStats,
  handleGetDashboardKpis,
} from './dashboard'
import {
  shareTools,
  handleCreateShare,
  handleListShares,
  handleRevokeShare,
} from './shares'
import {
  connectionTools,
  handleGetConnectionStatus,
} from './connection'

// Combine all tool definitions
export function getToolDefinitions(): Tool[] {
  return [
    ...caseTools,
    ...dashboardTools,
    ...shareTools,
    ...connectionTools,
  ]
}

// Route tool calls to appropriate handlers
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  context: McpToolContext
): Promise<ToolResult> {
  switch (name) {
    // Case tools
    case 'list_cases':
      return handleListCases(args as any, context)
    case 'get_case':
      return handleGetCase(args as any, context)
    case 'add_internal_note':
      return handleAddInternalNote(args as any, context)
    case 'add_external_note':
      return handleAddExternalNote(args as any, context)

    // Dashboard tools
    case 'get_dashboard_stats':
      return handleGetDashboardStats(context)
    case 'get_dashboard_kpis':
      return handleGetDashboardKpis(context)

    // Share tools
    case 'create_share':
      return handleCreateShare(args as any, context)
    case 'list_shares':
      return handleListShares(args as any, context)
    case 'revoke_share':
      return handleRevokeShare(args as any, context)

    // Connection tools
    case 'get_connection_status':
      return handleGetConnectionStatus(context)

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
  }
}

// Re-export for convenience
export function registerAllTools(server: any, userId: string): void {
  // This function is kept for API compatibility but the actual registration
  // is done in server.ts using the SDK's request handlers
}
