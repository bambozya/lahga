import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const ex = await db.query.examples.findFirst({ where: eq(schema.examples.id, id) })
  if (!ex || ex.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'المثال غير موجود' })
  assertOwner(ex, user)
  if (user.role !== 'admin' && await voteCount(db, 'example', id) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'لا يمكن حذف المثال بعد أن صوّت عليه آخرون' })
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.examples).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.examples.id, id))
    await recordRevision(tx, 'example', id, { status: 'deleted' }, user.id)
  })
  return { ok: true }
})
