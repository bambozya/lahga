import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { idParam } from '../../../utils/validate'

/** The logged searches behind one missed term, newest first (the last 90 days, at most 200). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam(event, 'السجل غير موجود')
  const db = await useDb()
  return db.select().from(schema.searchMissEvents)
    .where(eq(schema.searchMissEvents.missId, id))
    .orderBy(desc(schema.searchMissEvents.at))
    .limit(200)
})
