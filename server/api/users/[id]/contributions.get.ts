import { and, desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** A user's public contributions: the words and dialect entries they added. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const [words, entries] = await Promise.all([
    db.query.words.findMany({
      where: and(eq(schema.words.createdBy, id), eq(schema.words.status, 'active')),
      orderBy: desc(schema.words.createdAt), limit: 100,
    }),
    db.query.entries.findMany({
      where: and(eq(schema.entries.createdBy, id), eq(schema.entries.status, 'active')),
      orderBy: desc(schema.entries.createdAt), limit: 100,
      with: { dialect: true, links: { with: { word: true } } },
    }),
  ])
  return {
    words: words.map(w => ({ id: w.id, slug: w.slug, headword: w.headword, kind: w.kind, createdAt: w.createdAt })),
    entries: entries.map(e => ({
      id: e.id, form: e.form, createdAt: e.createdAt,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      word: e.links.filter(l => l.status === 'active' && l.word.status === 'active').map(l => ({ id: l.word.id, slug: l.word.slug, headword: l.word.headword }))[0] ?? null,
    })),
  }
})
