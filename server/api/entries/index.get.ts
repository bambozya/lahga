import { and, desc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The feed: latest dialect entries, each with its dialect, examples, the MSA
 * word(s) it links to, and the sibling entries (same word, other dialects)
 * shown as synonyms.
 *
 * Two flat queries instead of one deeply nested one: the entries with their
 * direct relations, then every active entry of the words involved in one go.
 * With fifteen synonyms per word the nested form took a second per page.
 */
export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  const db = await useDb()
  const max = Math.min(Number(limit) || 20, 50)

  const rows = await db.query.entries.findMany({
    where: eq(schema.entries.status, 'active'),
    orderBy: desc(schema.entries.createdAt),
    limit: max,
    with: { dialect: true, examples: true, links: { with: { word: true } } },
  })

  // All active entries of the words on this page, for the synonym lists.
  const wordIds = [...new Set(rows.flatMap(e => e.links.filter(l => l.status === 'active' && l.word.status === 'active').map(l => l.wordId)))]
  const siblings = wordIds.length
    ? await db.select({
        wordId: schema.wordEntryLinks.wordId, id: schema.entries.id, form: schema.entries.form,
        slug: schema.dialects.slug, nameAr: schema.dialects.nameAr,
      })
      .from(schema.wordEntryLinks)
      .innerJoin(schema.entries, eq(schema.entries.id, schema.wordEntryLinks.entryId))
      .innerJoin(schema.dialects, eq(schema.dialects.id, schema.entries.dialectId))
      .where(and(inArray(schema.wordEntryLinks.wordId, wordIds), eq(schema.wordEntryLinks.status, 'active'), eq(schema.entries.status, 'active')))
      .orderBy(desc(schema.entries.score), schema.entries.id)
    : []
  const byWord = new Map<number, typeof siblings>()
  for (const s of siblings) (byWord.get(s.wordId) ?? byWord.set(s.wordId, []).get(s.wordId)!).push(s)

  const { user } = await getUserSession(event)
  const mine = await myVotes(db, user?.id, 'entry', rows.map(r => r.id))

  return rows.map((e) => {
    const words = e.links.filter(l => l.status === 'active' && l.word.status === 'active').map(l => l.word)
    const synonyms = words.flatMap(w => (byWord.get(w.id) ?? [])
      .filter(s => s.id !== e.id)
      .map(s => ({ id: s.id, form: s.form, wordId: w.id, dialect: { slug: s.slug, nameAr: s.nameAr } })))
    return {
      id: e.id, form: e.form, meaning: e.meaning, notes: e.notes, score: e.score, myVote: mine[e.id] ?? 0, createdBy: e.createdBy, createdAt: e.createdAt,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      words: words.map(w => ({ id: w.id, headword: w.headword })),
      examples: e.examples.filter(x => x.status === 'active').map(x => ({ id: x.id, text: x.text, gloss: x.gloss })),
      synonyms,
    }
  })
})
