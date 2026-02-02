import { getDynamicsClient } from '../../../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const caseId = getRouterParam(event, 'id')
  const attachmentId = getRouterParam(event, 'annotationId')

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  if (!attachmentId) {
    throw createError({
      statusCode: 400,
      message: 'Attachment ID is required',
    })
  }

  // Fetch from Dynamics
  const { client } = await getDynamicsClient(event, userId)

  try {
    const attachment = await client.downloadAttachment(attachmentId)

    return {
      documentbody: attachment.content,
      filename: attachment.fileName,
      mimetype: attachment.mimeType,
    }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch attachment',
    })
  }
})
