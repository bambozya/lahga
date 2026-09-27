import { and, asc, desc, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * Terms people searched and found nothing for: the list to seed next
 * (docs/REACH.md, Phase R1). Newest first by default; ?sort=count ranks by how
 * often, ?dir=asc flips either order. The other column breaks ties.
 *
 * Each term carries a summary of its logged events (the last 90 days, see
 * server/utils/searchVisitor.ts): how many looked like people and how many like
 * bots, how many distinct visitors, and the countries the people searched from.
 * ?bots=0 leaves out terms only bots have searched for. Terms from before the
 * events were logged have none and are always kept.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { sort, dir, bots } = getQuery(event)
  const byCount = sort === 'count'
  const order = dir === 'asc' ? asc : desc
  const db = await useDb()
  const e = schema.searchMissEvents
  const m = schema.searchMisses

  const onlyBots = sql`exists (select 1 from ${e} where ${e.missId} = ${m.id} and ${e.bot} is not null)
    and not exists (select 1 from ${e} where ${e.missId} = ${m.id} and ${e.bot} is null)`
  // The plain query builder, not db.query: that one aliases the table, and the
  // subqueries above would then point at columns that do not exist.
  const misses = await db.select().from(m)
    .where(bots === '0' ? sql`not (${onlyBots})` : undefined)
    .orderBy(...(byCount
      ? [order(m.count), desc(m.lastSearchedAt)]
      : [order(m.lastSearchedAt), desc(m.count)]))
    .limit(200)
  if (!misses.length) return []
  const ids = misses.map(r => r.id)

  const totals = await db.select({
    missId: e.missId,
    people: sql<number>`count(*) filter (where ${e.bot} is null)::int`,
    bots: sql<number>`count(*) filter (where ${e.bot} is not null)::int`,
    visitors: sql<number>`count(distinct ${e.visitor}) filter (where ${e.bot} is null)::int`,
  }).from(e).where(inArray(e.missId, ids)).groupBy(e.missId)

  const countries = await db.select({ missId: e.missId, country: e.country, n: sql<number>`count(*)::int` })
    .from(e)
    .where(and(inArray(e.missId, ids), isNull(e.bot), isNotNull(e.country)))
    .groupBy(e.missId, e.country)
    .orderBy(desc(sql`count(*)`))

  const byMiss = new Map(totals.map(t => [t.missId, t]))
  return misses.map(r => ({
    ...r,
    people: byMiss.get(r.id)?.people ?? 0,
    bots: byMiss.get(r.id)?.bots ?? 0,
    visitors: byMiss.get(r.id)?.visitors ?? 0,
    countries: countries.filter(c => c.missId === r.id).slice(0, 3).map(c => ({ code: c.country!, n: c.n })),
  }))
})
