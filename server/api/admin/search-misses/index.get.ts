import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Terms people searched and found nothing for, most-searched first: the list to seed next (docs/REACH.md, Phase R1). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  return db.query.searchMisses.findMany({
    orderBy: [desc(schema.searchMisses.count), desc(schema.searchMisses.lastSearchedAt)],
    limit: 200,
  })
})
