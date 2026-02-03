import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { getDynamicsClientForUser } from '../../utils/dynamics'
import type { McpToolContext, ToolResult } from '../types'

// Tool definitions
export const dashboardTools: Tool[] = [
  {
    name: 'get_dashboard_stats',
    description: 'Get high-level case statistics including total cases, open cases, and cases resolved today.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_dashboard_kpis',
    description: 'Get detailed KPI analytics including cases by status, cases by priority, and SLA compliance percentage.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// Tool handlers
export async function handleGetDashboardStats(context: McpToolContext): Promise<ToolResult> {
  try {
    const { client, dynamicsUserId } = await getDynamicsClientForUser(context.userId)
    const stats = await client.getDashboardStats(dynamicsUserId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalCases: stats.totalCases,
            openCases: stats.openCases,
            resolvedToday: stats.resolvedToday,
            avgFirstResponseTime: stats.avgFirstResponseTime,
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting dashboard stats: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleGetDashboardKpis(context: McpToolContext): Promise<ToolResult> {
  try {
    const { client, dynamicsUserId } = await getDynamicsClientForUser(context.userId)
    const kpis = await client.getDashboardKPIs(dynamicsUserId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            casesByStatus: kpis.casesByStatus,
            casesByPriority: kpis.casesByPriority,
            slaCompliancePercent: kpis.slaCompliancePercent,
            resolutionTimeTrend: kpis.resolutionTimeTrend,
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting dashboard KPIs: ${(error as Error).message}` }],
      isError: true,
    }
  }
}
