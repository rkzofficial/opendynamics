import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { getDynamicsClientForUser } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import type { McpToolContext, ToolResult, ListCasesArgs, GetCaseArgs, GetCaseActivitiesArgs, AddCaseNoteArgs, GetSlaKpisArgs, GetBatchSlaArgs } from '../types'

// Tool definitions
export const caseTools: Tool[] = [
  {
    name: 'list_cases',
    description: 'List cases from Dynamics 365 CRM with optional filters. Returns case ID, title, ticket number, status, priority, and creation date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'resolved', 'cancelled'],
          description: 'Filter by case status',
        },
        priority: {
          type: 'string',
          enum: ['critical', 'urgent', 'important', 'minor'],
          description: 'Filter by case priority (P1-Critical, P2-Urgent, P3-Important, P4-Minor)',
        },
        search: {
          type: 'string',
          description: 'Search in case title or ticket number',
        },
        dateFrom: {
          type: 'string',
          description: 'Filter cases created after this date (ISO format)',
        },
        dateTo: {
          type: 'string',
          description: 'Filter cases created before this date (ISO format)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of cases to return (default: 20, max: 50)',
        },
        skipToken: {
          type: 'string',
          description: 'Pagination token for next page',
        },
      },
    },
  },
  {
    name: 'get_case',
    description: 'Get detailed information about a specific case by ID, including customer info, owner, SLA deadlines, and contact preferences.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
      },
      required: ['caseId'],
    },
  },
  {
    name: 'get_case_activities',
    description: 'Get activities (emails, phone calls, tasks) and notes/annotations for a case.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
      },
      required: ['caseId'],
    },
  },
  {
    name: 'add_case_note',
    description: 'Add a note/annotation to a case.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
        noteText: {
          type: 'string',
          description: 'The note content',
        },
        subject: {
          type: 'string',
          description: 'Optional subject line for the note',
        },
      },
      required: ['caseId', 'noteText'],
    },
  },
  {
    name: 'get_sla_kpis',
    description: 'Get SLA KPI instances for a specific case, showing response/resolution deadlines and compliance status.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
      },
      required: ['caseId'],
    },
  },
  {
    name: 'get_batch_sla',
    description: 'Get SLA data for multiple cases at once (max 20 cases per request).',
    inputSchema: {
      type: 'object',
      properties: {
        caseIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of case IDs (max 20)',
        },
      },
      required: ['caseIds'],
    },
  },
]

// Tool handlers
export async function handleListCases(args: ListCasesArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    const { client, dynamicsUserId } = await getDynamicsClientForUser(context.userId)

    const pageSize = Math.min(args.pageSize || 20, 50)
    const filter = buildCaseFilter({
      status: args.status,
      priority: args.priority,
      search: args.search,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    })

    const response = await client.getCases(
      {
        filter: filter || undefined,
        orderby: 'createdon desc',
        top: pageSize,
        skipToken: args.skipToken,
      },
      dynamicsUserId
    )

    const cases = response.value as Array<{
      incidentid: string
      title: string
      ticketnumber: string
      statecode: number
      prioritycode: number
      createdon: string
    }>

    const statusMap: Record<number, string> = { 0: 'Active', 1: 'Resolved', 2: 'Cancelled' }
    const priorityMap: Record<number, string> = { 1: 'High', 2: 'Normal', 3: 'Low' }

    const formattedCases = cases.map((c) => ({
      id: c.incidentid,
      title: c.title,
      ticketNumber: c.ticketnumber,
      status: statusMap[c.statecode] || 'Unknown',
      priority: priorityMap[c.prioritycode] || 'Unknown',
      createdOn: c.createdon,
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cases: formattedCases,
            count: formattedCases.length,
            hasMore: !!response.nextSkipToken,
            skipToken: response.nextSkipToken,
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error listing cases: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleGetCase(args: GetCaseArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)
    const caseData = await client.getCase(args.caseId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(caseData, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting case: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleGetCaseActivities(args: GetCaseActivitiesArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)

    const [activities, annotations] = await Promise.all([
      client.getCaseActivities(args.caseId),
      client.getCaseAnnotations(args.caseId),
    ])

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            activities: activities.value,
            annotations: annotations.value,
          }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting case activities: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleAddCaseNote(args: AddCaseNoteArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId || !args.noteText) {
      return {
        content: [{ type: 'text', text: 'Error: caseId and noteText are required' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)
    await client.createAnnotation(args.caseId, args.noteText, args.subject)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Note added successfully' }),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error adding note: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleGetSlaKpis(args: GetSlaKpisArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)
    const slaData = await client.getCaseSLAKPIs(args.caseId)

    const statusMap: Record<number, string> = {
      0: 'In Progress',
      1: 'Noncompliant',
      2: 'Nearing Noncompliance',
      3: 'Paused',
      4: 'Succeeded',
      5: 'Canceled',
    }

    const formattedKpis = (slaData.value as Array<{
      slakpiinstanceid: string
      name: string
      status: number
      failuretime?: string
      warningtime?: string
      succeededon?: string
    }>).map((kpi) => ({
      id: kpi.slakpiinstanceid,
      name: kpi.name,
      status: statusMap[kpi.status] || 'Unknown',
      failureTime: kpi.failuretime,
      warningTime: kpi.warningtime,
      succeededOn: kpi.succeededon,
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ slaKpis: formattedKpis }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting SLA KPIs: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleGetBatchSla(args: GetBatchSlaArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    if (!args.caseIds || !Array.isArray(args.caseIds) || args.caseIds.length === 0) {
      return {
        content: [{ type: 'text', text: 'Error: caseIds array is required' }],
        isError: true,
      }
    }

    if (args.caseIds.length > 20) {
      return {
        content: [{ type: 'text', text: 'Error: Maximum 20 case IDs per request' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)
    const slaData = await client.getBatchCaseSLAKPIs(args.caseIds)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ slaData }, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting batch SLA data: ${(error as Error).message}` }],
      isError: true,
    }
  }
}
