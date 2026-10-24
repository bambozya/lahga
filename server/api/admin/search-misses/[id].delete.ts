import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { idParam } from '../../../utils/validate'

/** Drops one search miss: gibberish or noise an admin does not want in the seed list. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = idParam(event, 'السجل غير موجود')
  const db = await useDb()
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(schema.searchMisses).where(eq(schema.searchMisses.id, id)).returning({ id: schema.searchMisses.id, term: schema.searchMisses.term })
    if (!row) throw createError({ statusCode: 404, statusMessage: 'السجل غير موجود' })
    await logModeration(tx, admin.id, 'delete_search_miss', 'search_miss', id, row.term.slice(0, 300))
  })
  return { ok: true }
})
