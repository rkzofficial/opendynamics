import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { getDynamicsClientForUser } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import { mapCaseToListItem, mapBatchSLA, buildCaseDetail } from '../../utils/mappers'
import type { McpToolContext, ToolResult, ListCasesArgs, GetCaseArgs, AddCaseNoteArgs } from '../types'

// Tool definitions
export const caseTools: Tool[] = [
  {
    name: 'list_cases',
    description: 'List cases from Dynamics 365 CRM with optional filters. Returns cases with embedded SLA data for in-progress cases.',
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
    description: 'Get full case details including activities, notes, attachments, and SLA KPIs in a single call.',
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

    const rawCases = response.value as any[]

    // Fetch SLA data for in-progress cases
    const inProgressCaseIds = rawCases
      .filter((c: any) => c.statuscode === 1)
      .map((c: any) => c.incidentid)

    let slaData: Record<string, any> = {}
    if (inProgressCaseIds.length > 0) {
      try {
        const rawSLA = await client.getBatchCaseSLAKPIs(inProgressCaseIds)
        slaData = mapBatchSLA(rawSLA)
      } catch {
        // Silent fail for SLA data
      }
    }

    const cases = rawCases.map((c: any) => {
      const caseId = c.incidentid
      const sla = slaData[caseId.toLowerCase()]
      return mapCaseToListItem(c, sla)
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cases,
            count: cases.length,
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
    const caseDetail = await buildCaseDetail(client, args.caseId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(caseDetail, null, 2),
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
