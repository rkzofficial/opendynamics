import bcrypt from 'bcryptjs'
import { api } from '@convex/_generated/api'
import { getConvexClient } from '../../../utils/convex'
import { requireAdmin } from '../../../utils/auth'
import type { Id } from '@convex/_generated/dataModel'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const userId = getRouterParam(event, 'id') as Id<'users'>
  const body = await readBody(event)
  const { email, name, role, password } = body

  if (role && !['admin', 'user'].includes(role)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role',
    })
  }

  const convex = getConvexClient()

  try {
    const updateData: {
      userId: Id<'users'>
      email?: string
      name?: string
      role?: 'admin' | 'user'
      passwordHash?: string
    } = {
      userId,
    }

    if (email !== undefined) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

    await convex.mutation(api.users.update, updateData)

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    throw createError({
      statusCode: 400,
      message: err.message || 'Failed to update user',
    })
  }
})
