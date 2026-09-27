import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** The logged searches behind one missed term, newest first (the last 90 days, at most 200). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'معرّف غير صالح' })
  const db = await useDb()
  return db.select().from(schema.searchMissEvents)
    .where(eq(schema.searchMissEvents.missId, id))
    .orderBy(desc(schema.searchMissEvents.at))
    .limit(200)
})
