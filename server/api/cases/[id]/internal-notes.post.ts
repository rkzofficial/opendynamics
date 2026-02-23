import { getDynamicsClient } from '../../../utils/dynamics'
import { hasVisibleHtmlContent } from '../../../utils/html'

interface InternalNoteBody {
  subject?: string
  description?: string
}

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

  const body = await readBody<InternalNoteBody>(event)
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const description = typeof body?.description === 'string' ? body.description : ''

  if (!subject) {
    throw createError({
      statusCode: 400,
      message: 'Subject is required',
    })
  }

  if (!description || !hasVisibleHtmlContent(description)) {
    throw createError({
      statusCode: 400,
      message: 'Description is required',
    })
  }

  const { client, dynamicsUserId } = await getDynamicsClient(event, userId)

  let ownerSystemUserId = dynamicsUserId

  if (!ownerSystemUserId) {
    const whoAmI = await client.whoAmI()
    ownerSystemUserId = whoAmI?.UserId
  }

  if (!ownerSystemUserId) {
    throw createError({
      statusCode: 500,
      message: 'Failed to resolve Dynamics owner user ID',
    })
  }

  try {
    await client.createInternalNote(caseId, subject, description, ownerSystemUserId)
    return { success: true }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to add internal note',
    })
  }
})
