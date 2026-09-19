import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The dialect tree: active top-level groups, each with its active children.
 * Only the first paragraph of each description travels — the list pages show
 * no more than that, and the dialect page fetches its own full text.
 */
export default defineEventHandler(async () => {
  const db = await useDb()
  const rows = await db.select().from(schema.dialects)
    .where(eq(schema.dialects.active, 1))
    .orderBy(asc(schema.dialects.sortOrder))
  const top = rows.filter(r => r.parentId === null)
  const summary = (t: string | null) => (t ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
  return top.map(g => ({
    id: g.id, slug: g.slug, nameAr: g.nameAr, summaryAr: summary(g.descriptionAr),
    children: rows.filter(r => r.parentId === g.id).map(c => ({ id: c.id, slug: c.slug, nameAr: c.nameAr })),
  }))
})
