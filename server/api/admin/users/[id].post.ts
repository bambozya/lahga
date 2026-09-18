import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { readBody$ } from '../../../utils/validate'

/** Bans or unbans a user. A banned user cannot log in or act; their content stays. */
const Body = v.object({
  banned: v.boolean('قيمة غير صالحة'),
  reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  if (id === admin.id) throw createError({ statusCode: 400, statusMessage: 'لا يمكنك إيقاف حسابك' })
  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!user || user.deletedAt) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  if (user.role === 'admin') throw createError({ statusCode: 400, statusMessage: 'لا يمكن إيقاف مدير' })
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ bannedAt: body.banned ? new Date() : null, banReason: body.banned ? body.reason || null : null }).where(eq(schema.users.id, id))
    await logModeration(tx, admin.id, body.banned ? 'ban' : 'unban', 'user', id, body.reason)
  })
  return { ok: true }
})
