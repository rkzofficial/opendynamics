import { getDynamicsClient } from '../../../utils/dynamics'
import type { Annotation, CaseAttachment } from '~/types'

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

  // Fetch from Dynamics
  const { client } = await getDynamicsClient(event, userId)

  try {
    const [activitiesResponse, annotationsResponse, attachmentsResponse] = await Promise.all([
      client.getCaseActivities(caseId),
      client.getCaseAnnotations(caseId),
      client.getCaseAttachments(caseId),
    ])

    // Filter out annotations that are documents (keep only text notes)
    const allAnnotations = annotationsResponse.value as Annotation[]
    const annotations = allAnnotations.filter(a => !a.isdocument)

    // Map custom Adobe attachments to CaseAttachment format
    const attachments: CaseAttachment[] = attachmentsResponse.attachments.map(a => ({
      annotationid: a.attachmentMetadataId,
      filename: a.fileName,
      mimetype: a.mimeType || 'application/octet-stream',
      createdon: a.createdOn,
      createdby: a.uploadedBy ? { fullname: a.uploadedBy } : undefined,
    }))

    return {
      activities: activitiesResponse.value,
      annotations,
      attachments,
    }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch activities',
    })
  }
})
