import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The feed: latest dialect entries, each with its dialect, examples, the MSA
 * word(s) it links to, and the sibling entries (same word, other dialects)
 * shown as synonyms.
 */
export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  const db = await useDb()
  const max = Math.min(Number(limit) || 20, 50)

  const rows = await db.query.entries.findMany({
    where: eq(schema.entries.status, 'active'),
    orderBy: desc(schema.entries.createdAt),
    limit: max,
    with: {
      dialect: true,
      examples: true,
      links: { with: { word: { with: { links: { with: { entry: { with: { dialect: true } } } } } } } },
    },
  })

  return rows.map((e) => {
    const words = e.links.filter(l => l.status === 'active' && l.word.status === 'active').map(l => l.word)
    const synonyms = words.flatMap(w => w.links
      .filter(l => l.status === 'active' && l.entry.id !== e.id && l.entry.status === 'active')
      .map(l => ({ id: l.entry.id, form: l.entry.form, wordId: w.id, dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr } })))
    return {
      id: e.id, form: e.form, meaning: e.meaning, notes: e.notes, score: e.score, createdAt: e.createdAt,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      words: words.map(w => ({ id: w.id, headword: w.headword })),
      examples: e.examples.filter(x => x.status === 'active').map(x => ({ id: x.id, text: x.text, gloss: x.gloss })),
      synonyms,
    }
  })
})
