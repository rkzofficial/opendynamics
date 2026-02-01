import { getDynamicsClient } from '../../../utils/dynamics'
import { invalidateCacheByPrefix } from '../../../utils/cache'

export default defineEventHandler(async (event) => {
  const { client } = await getDynamicsClient(event)
  const caseId = getRouterParam(event, 'id')

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
    
    // Invalidate activities cache for this case
    await invalidateCacheByPrefix(event, `cases:activities:${caseId}`)
    
    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to add note',
    })
  }
})
