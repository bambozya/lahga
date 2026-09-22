import { sql } from 'drizzle-orm'
import { useDb } from '../db'
import { MIN_SHARED } from './compare/[a]/[b].get'

/**
 * The dialect pairs worth comparing, most words in common first (docs/REACH.md,
 * Phase R4) — what the comparison links are built from, so the site never
 * offers a pair with nothing on it.
 *
 * Counted by group, so a pair means two regions rather than two arbitrary
 * sub-dialects, and only pairs above MIN_SHARED are returned.
 */
export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  return topPairs(await useDb(), limitParam(limit, 10, 40))
})

/** Shared by the handler and the sitemap, so the pages offered and the pages listed can never drift apart. */
export async function topPairs(db: Awaited<ReturnType<typeof useDb>>, max: number) {
  const result: any = await db.execute(sql`
    with wg as (
      select distinct
        wel.word_id,
        coalesce(d.parent_id, d.id) as group_id
      from word_entry_links wel
      join entries e on e.id = wel.entry_id
      join dialects d on d.id = e.dialect_id
      join words w on w.id = wel.word_id
      where wel.status = 'active' and e.status = 'active' and w.status = 'active'
    )
    select
      g1.slug as "aSlug", g1.name_ar as "aName",
      g2.slug as "bSlug", g2.name_ar as "bName",
      count(*)::int as shared
    from wg x
    join wg y on y.word_id = x.word_id and y.group_id > x.group_id
    join dialects g1 on g1.id = x.group_id
    join dialects g2 on g2.id = y.group_id
    where g1.active = 1 and g2.active = 1
    group by g1.slug, g1.name_ar, g2.slug, g2.name_ar
    having count(*) >= ${MIN_SHARED}
    order by shared desc, g1.slug, g2.slug
    limit ${max}
  `)

  const rows = Array.isArray(result) ? result : result?.rows ?? []
  return rows.map((r: any) => ({
    a: { slug: r.aSlug ?? r.aslug, nameAr: r.aName ?? r.aname },
    b: { slug: r.bSlug ?? r.bslug, nameAr: r.bName ?? r.bname },
    shared: Number(r.shared),
  }))
}
