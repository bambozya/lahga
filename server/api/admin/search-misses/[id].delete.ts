import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Drops one search miss: gibberish or noise an admin does not want in the seed list. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'معرّف غير صالح' })
  const db = await useDb()
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(schema.searchMisses).where(eq(schema.searchMisses.id, id)).returning({ id: schema.searchMisses.id, term: schema.searchMisses.term })
    if (!row) throw createError({ statusCode: 404, statusMessage: 'السجل غير موجود' })
    await logModeration(tx, admin.id, 'delete_search_miss', 'search_miss', id, row.term.slice(0, 300))
  })
  return { ok: true }
})
