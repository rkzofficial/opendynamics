import bcrypt from 'bcryptjs'
import { api } from '../../../../convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { username, password, email, name, role } = body

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required',
    })
  }

  if (role && !['admin', 'user'].includes(role)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role',
    })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const convex = getConvexClient()

  try {
    const userId = await convex.mutation(api.users.create, {
      username,
      passwordHash,
      email: email || undefined,
      name: name || undefined,
      role: role || 'user',
    })

    return { success: true, userId }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 400,
      message: err.message || 'Failed to create user',
    })
  }
})
