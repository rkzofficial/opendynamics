import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { getDynamicsClientForUser } from '../../utils/dynamics'
import { buildCaseFilter } from '../../utils/odata-builder'
import { mapCaseToListItem, mapBatchSLA, buildCaseDetail } from '../../utils/mappers'
import { hasVisibleHtmlContent } from '../../utils/html'
import type { McpToolContext, ToolResult, ListCasesArgs, GetCaseArgs, AddInternalNoteArgs, AddExternalNoteArgs } from '../types'

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
    name: 'add_internal_note',
    description: 'Add an internal/private note to a case (maps to POST /api/cases/:id/internal-notes).',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
        subject: {
          type: 'string',
          description: 'Internal note subject (required)',
        },
        description: {
          type: 'string',
          description: 'Internal note rich HTML body (required)',
        },
      },
      required: ['caseId', 'subject', 'description'],
    },
  },
  {
    name: 'add_external_note',
    description: 'Add an external/customer note to a case (maps to POST /api/cases/:id/external-notes). actionType values: 2=Pending Response, 1=Comment, 0=Resolution Provided.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case ID (incidentid GUID)',
        },
        actionType: {
          type: 'number',
          enum: [0, 1, 2],
          description: 'External action type: 2=Pending Response, 1=Comment, 0=Resolution Provided',
        },
        messageHtml: {
          type: 'string',
          description: 'External note rich HTML body (required)',
        },
      },
      required: ['caseId', 'actionType', 'messageHtml'],
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

export async function handleAddInternalNote(args: AddInternalNoteArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    const caseId = typeof args.caseId === 'string' ? args.caseId.trim() : ''
    const subject = typeof args.subject === 'string' ? args.subject.trim() : ''
    const description = typeof args.description === 'string' ? args.description : ''

    if (!caseId || !subject || !description || !hasVisibleHtmlContent(description)) {
      return {
        content: [{ type: 'text', text: 'Error: caseId, subject, and description are required' }],
        isError: true,
      }
    }

    const { client, dynamicsUserId } = await getDynamicsClientForUser(context.userId)
    let ownerSystemUserId = dynamicsUserId
    if (!ownerSystemUserId) {
      const whoAmI = await client.whoAmI()
      ownerSystemUserId = whoAmI?.UserId
    }

    if (!ownerSystemUserId) {
      return {
        content: [{ type: 'text', text: 'Error: Failed to resolve Dynamics owner user ID' }],
        isError: true,
      }
    }

    await client.createInternalNote(caseId, subject, description, ownerSystemUserId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Internal note added successfully' }),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error adding internal note: ${(error as Error).message}` }],
      isError: true,
    }
  }
}

export async function handleAddExternalNote(args: AddExternalNoteArgs, context: McpToolContext): Promise<ToolResult> {
  try {
    const caseId = typeof args.caseId === 'string' ? args.caseId.trim() : ''
    const messageHtml = typeof args.messageHtml === 'string' ? args.messageHtml : ''
    const actionType = Number(args.actionType)

    if (!caseId) {
      return {
        content: [{ type: 'text', text: 'Error: caseId is required' }],
        isError: true,
      }
    }

    if (!Number.isInteger(actionType) || ![0, 1, 2].includes(actionType)) {
      return {
        content: [{ type: 'text', text: 'Error: actionType must be one of 0, 1, or 2' }],
        isError: true,
      }
    }

    if (!messageHtml || !hasVisibleHtmlContent(messageHtml)) {
      return {
        content: [{ type: 'text', text: 'Error: messageHtml is required' }],
        isError: true,
      }
    }

    const { client } = await getDynamicsClientForUser(context.userId)
    await client.createExternalNote(caseId, actionType as 0 | 1 | 2, messageHtml)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'External note added successfully' }),
        },
      ],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error adding external note: ${(error as Error).message}` }],
      isError: true,
    }
  }
}
