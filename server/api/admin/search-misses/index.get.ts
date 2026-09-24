import { asc, desc } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * Terms people searched and found nothing for: the list to seed next
 * (docs/REACH.md, Phase R1). Newest first by default; ?sort=count ranks by how
 * often, ?dir=asc flips either order. The other column breaks ties.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { sort, dir } = getQuery(event)
  const byCount = sort === 'count'
  const order = dir === 'asc' ? asc : desc
  const db = await useDb()
  return db.query.searchMisses.findMany({
    orderBy: byCount
      ? [order(schema.searchMisses.count), desc(schema.searchMisses.lastSearchedAt)]
      : [order(schema.searchMisses.lastSearchedAt), desc(schema.searchMisses.count)],
    limit: 200,
  })
})
