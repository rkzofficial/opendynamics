import { getDynamicsClient } from '../../../utils/dynamics'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const caseId = getRouterParam(event, 'id')

  const { client } = await getDynamicsClient(event, userId)

  if (!caseId) {
    throw createError({
      statusCode: 400,
      message: 'Case ID is required',
    })
  }

  const body = await readBody(event)
  const { noteText, subject } = body

  if (!noteText) {
    throw createError({
      statusCode: 400,
      message: 'Note text is required',
    })
  }

  try {
    await client.createAnnotation(caseId, noteText, subject)

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to add note',
    })
  }
})
