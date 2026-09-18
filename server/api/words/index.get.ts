import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { normalizeArabic } from '../../../shared/utils/arabic'

/**
 * List words, newest first, or search them.
 * ?q= matches the MSA headword or any linked dialect form (normalised, prefix + substring).
 */
export default defineEventHandler(async (event) => {
  const { q, limit } = getQuery(event)
  const db = await useDb()
  const max = Math.min(Number(limit) || 20, 50)

  const term = typeof q === 'string' ? normalizeArabic(q) : ''
  if (!term) {
    return db.query.words.findMany({
      where: eq(schema.words.status, 'active'),
      orderBy: desc(schema.words.createdAt),
      limit: max,
      with: { links: { with: { entry: { with: { dialect: true } } } } },
    }).then(shape)
  }

  const pattern = `%${term}%`
  const matchedEntryWords = db.select({ id: schema.wordEntryLinks.wordId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(ilike(schema.entries.formNormalized, pattern))

  const ids = await db.select({ id: schema.words.id }).from(schema.words)
    .where(and(
      eq(schema.words.status, 'active'),
      or(
        ilike(schema.words.headwordNormalized, pattern),
        sql`${schema.words.id} in ${matchedEntryWords}`,
      ),
    ))
    .limit(max)
  if (!ids.length) return []

  const rows = await db.query.words.findMany({
    where: sql`${schema.words.id} in (${sql.join(ids.map(r => sql`${r.id}`), sql`, `)})`,
    with: { links: { with: { entry: { with: { dialect: true } } } } },
  })
  return shape(rows)
})

function shape(rows: any[]) {
  return rows.map(w => ({
    id: w.id, headword: w.headword, definition: w.definition, score: w.score,
    entries: w.links
      .filter((l: any) => l.status === 'active' && l.entry.status === 'active')
      .sort((a: any, b: any) => b.score - a.score)
      .map((l: any) => ({ id: l.entry.id, form: l.entry.form, dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr } })),
  }))
}
