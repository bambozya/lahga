import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** The dialect tree: active top-level groups, each with its active children. */
export default defineEventHandler(async () => {
  const db = await useDb()
  const rows = await db.select().from(schema.dialects)
    .where(eq(schema.dialects.active, 1))
    .orderBy(asc(schema.dialects.sortOrder))
  const top = rows.filter(r => r.parentId === null)
  return top.map(g => ({
    id: g.id, slug: g.slug, nameAr: g.nameAr, descriptionAr: g.descriptionAr,
    children: rows.filter(r => r.parentId === g.id).map(c => ({ id: c.id, slug: c.slug, nameAr: c.nameAr })),
  }))
})
