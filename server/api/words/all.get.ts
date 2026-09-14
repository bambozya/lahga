import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * Every active word with its dialect forms. Used by the static (GitHub Pages)
 * build, where there is no server to search, so the browser filters this list.
 */
export default defineEventHandler(async () => {
  const db = await useDb()
  const rows = await db.query.words.findMany({
    where: eq(schema.words.status, 'active'),
    orderBy: desc(schema.words.createdAt),
    limit: 500,
    with: { links: { with: { entry: { with: { dialect: true } } } } },
  })
  return rows.map(w => ({
    id: w.id, headword: w.headword, definition: w.definition, score: w.score,
    entries: w.links
      .filter(l => l.status === 'active' && l.entry.status === 'active')
      .sort((a, b) => b.score - a.score)
      .map(l => ({ id: l.entry.id, form: l.entry.form, dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr } })),
  }))
})
