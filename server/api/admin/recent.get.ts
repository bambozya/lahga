import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** The latest words, entries and examples, whatever their status, for a quick look at what is coming in. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const [words, entries, examples] = await Promise.all([
    db.query.words.findMany({ orderBy: desc(schema.words.createdAt), limit: 30, with: { author: true } }),
    db.query.entries.findMany({ orderBy: desc(schema.entries.createdAt), limit: 30, with: { author: true, dialect: true, links: true } }),
    db.query.examples.findMany({ orderBy: desc(schema.examples.createdAt), limit: 30, with: { author: true, entry: { with: { links: true } } } }),
  ])
  const items = [
    ...words.map(w => ({ type: 'word' as const, id: w.id, text: w.headword, detail: w.definition, status: w.status, createdAt: w.createdAt, author: publicUser(w.author), wordId: w.id })),
    ...entries.map(e => ({ type: 'entry' as const, id: e.id, text: `${e.form} (${e.dialect.nameAr})`, detail: e.meaning, status: e.status, createdAt: e.createdAt, author: publicUser(e.author), wordId: e.links[0]?.wordId ?? null })),
    ...examples.map(x => ({ type: 'example' as const, id: x.id, text: x.text, detail: x.gloss, status: x.status, createdAt: x.createdAt, author: publicUser(x.author), wordId: x.entry.links[0]?.wordId ?? null })),
  ]
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)
})
