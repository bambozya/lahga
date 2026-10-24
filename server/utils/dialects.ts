import { and, eq, sql } from 'drizzle-orm'
import { schema, type useDb } from '../db'
import { MIN_SHARED } from '../../shared/config/rules'
import { rowsOf } from './sql'

/**
 * Dialect-level counts that more than one route needs: the dialect pages and
 * the tree (/api/dialects), the sitemap and llms.txt, the comparison links.
 * Here rather than in one of those routes, so no route imports another.
 */
/** How many live words each dialect holds, by id; a dialect with none is absent. */
export async function entryCounts(db: Awaited<ReturnType<typeof useDb>>) {
  const rows = await db.select({ id: schema.entries.dialectId, n: sql<number>`count(*)::int` })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(eq(schema.entries.status, 'active'), eq(schema.wordEntryLinks.status, 'active')))
    .groupBy(schema.entries.dialectId)
  return new Map(rows.map(r => [r.id, Number(r.n)]))
}

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

  const rows = rowsOf(result)
  return rows.map((r: any) => ({
    a: { slug: r.aSlug ?? r.aslug, nameAr: r.aName ?? r.aname },
    b: { slug: r.bSlug ?? r.bslug, nameAr: r.bName ?? r.bname },
    shared: Number(r.shared),
  }))
}
