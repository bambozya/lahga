import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** Public profile: only what anyone may see. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!user || user.deletedAt) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  return { id: user.id, displayName: user.displayName, bio: user.bio, role: user.role, createdAt: user.createdAt }
})
