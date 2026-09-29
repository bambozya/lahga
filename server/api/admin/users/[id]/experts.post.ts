import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { readBody$ } from '../../../../utils/validate'

/**
 * Makes a member an expert in a dialect, or stops them being one
 * (schema.dialectExperts): their «yes» under a draft in it then checks the
 * draft alone, and what they add in it starts out checked (server/utils/experts.ts).
 */
const Body = v.object({
  dialect: v.pipe(v.string(), v.trim(), v.minLength(1, 'اختر اللهجة')),
  expert: v.boolean('قيمة غير صالحة'),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!user || user.deletedAt) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  if (body.expert && (!user.emailVerifiedAt || user.bannedAt)) throw createError({ statusCode: 400, statusMessage: 'الحساب غير مؤكد أو موقوف' })
  const dialect = await findDialect(db, body.dialect)
  await db.transaction(async (tx) => {
    const x = schema.dialectExperts
    if (body.expert) {
      const [row] = await tx.insert(x).values({ userId: id, dialectId: dialect.id, grantedBy: admin.id }).onConflictDoNothing().returning()
      if (row) await logModeration(tx, admin.id, 'grant_expert', 'user', id, dialect.slug)
    }
    else {
      const [row] = await tx.delete(x).where(and(eq(x.userId, id), eq(x.dialectId, dialect.id))).returning()
      if (row) await logModeration(tx, admin.id, 'revoke_expert', 'user', id, dialect.slug)
    }
  })
  return { ok: true }
})
