import { getDynamicsClient } from '../../../utils/dynamics'
import { hasVisibleHtmlContent } from '../../../utils/html'

interface ExternalNoteBody {
  actionType?: number | string
  messageHtml?: string
}

const validActionTypes = new Set([0, 1, 2])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const caseId = getRouterParam(event, 'id')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  const body = await readBody<ExternalNoteBody>(event)
  const messageHtml = typeof body?.messageHtml === 'string' ? body.messageHtml : ''
  const actionTypeRaw = body?.actionType
  const actionType = typeof actionTypeRaw === 'string'
    ? Number(actionTypeRaw)
    : actionTypeRaw

  if (!Number.isInteger(actionType) || !validActionTypes.has(actionType as number)) {
    throw createError({
      statusCode: 400,
      message: 'Action type must be one of: 0, 1, 2',
    })
  }

  if (!messageHtml || !hasVisibleHtmlContent(messageHtml)) {
    throw createError({
      statusCode: 400,
      message: 'Message is required',
    })
  }

  const { client } = await getDynamicsClient(event, userId)

  try {
    await client.createExternalNote(caseId, actionType as 0 | 1 | 2, messageHtml)
    return { success: true }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to add external note',
    })
  }
})
