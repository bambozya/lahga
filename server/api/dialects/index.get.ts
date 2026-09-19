import { and, asc, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The dialect tree: active top-level groups, each with its active children.
 * Only the first paragraph of each description travels — the list pages show
 * no more than that, and the dialect page fetches its own full text.
 *
 * A sub-dialect with no words yet is left out. The tree is a promise about what
 * is in the dictionary, and a name that leads to an empty page is a promise
 * broken; بغدادي comes back by itself the moment someone files a word under it.
 * ?all=1 returns every active dialect regardless — what the contribution form
 * asks for, since that is where the first word comes from.
 */
export default defineEventHandler(async (event) => {
  const { all } = getQuery(event)
  const db = await useDb()
  const rows = await db.select().from(schema.dialects)
    .where(eq(schema.dialects.active, 1))
    .orderBy(asc(schema.dialects.sortOrder))

  const counted = all ? null : await entryCounts(db)
  const summary = (t: string | null) => (t ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
  const top = rows.filter(r => r.parentId === null)
  return top.map(g => ({
    id: g.id, slug: g.slug, nameAr: g.nameAr, summaryAr: summary(g.descriptionAr),
    children: rows
      .filter(r => r.parentId === g.id && (!counted || counted.has(r.id)))
      .map(c => ({ id: c.id, slug: c.slug, nameAr: c.nameAr })),
  }))
})

/** How many words a sub-dialect needs before it is worth a page of its own. */
const MIN_ENTRIES = 1

/** The ids of the dialects that carry at least that many live words. */
export async function entryCounts(db: Awaited<ReturnType<typeof useDb>>) {
  const rows = await db.select({ id: schema.entries.dialectId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(eq(schema.entries.status, 'active'), eq(schema.wordEntryLinks.status, 'active')))
    .groupBy(schema.entries.dialectId)
    .having(sql`count(*) >= ${MIN_ENTRIES}`)
  return new Set(rows.map(r => r.id))
}
