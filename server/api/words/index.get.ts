import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { normalizeArabic } from '../../../shared/utils/arabic'

/**
 * List words, newest first, or search them.
 * ?q= matches the MSA headword or any linked dialect form (normalised, prefix + substring).
 * ?fuzzy=1 answers a search that found nothing with the nearest words instead
 * (trigram similarity), so the empty result can still offer a way forward.
 * ?random=1 draws a handful at random instead of the newest: what the home page
 * shows when nobody is searching, and what the shuffle button asks for again.
 */
export default defineEventHandler(async (event) => {
  const { q, limit, fuzzy, random } = getQuery(event)
  const db = await useDb()
  const max = Math.min(Number(limit) || 20, 50)

  const term = typeof q === 'string' ? normalizeArabic(q) : ''
  if (!term) {
    // A random word with no dialect forms left would be an empty card, and on a
    // page of five that is a fifth of it: the draw is made among words that
    // still have something to show.
    const withEntries = db.select({ id: schema.wordEntryLinks.wordId })
      .from(schema.wordEntryLinks)
      .innerJoin(schema.entries, eq(schema.entries.id, schema.wordEntryLinks.entryId))
      .where(and(eq(schema.wordEntryLinks.status, 'active'), eq(schema.entries.status, 'active')))

    return db.query.words.findMany({
      where: random
        ? and(eq(schema.words.status, 'active'), sql`${schema.words.id} in ${withEntries}`)
        : eq(schema.words.status, 'active'),
      orderBy: random ? sql`random()` : desc(schema.words.createdAt),
      limit: max,
      with: { links: { with: { entry: { with: { dialect: true } } } } },
    }).then(shape)
  }

  // Substring match on the trigram-indexed columns (migration 0005), best matches first:
  // an exact headword, then a headword starting with the term, then by trigram similarity.
  // % and _ are wildcards in LIKE, so a search for them is a search for those
  // characters, not for everything.
  const pattern = `%${likeEscape(term)}%`
  const matchedEntryWords = db.select({ id: schema.wordEntryLinks.wordId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      ilike(schema.entries.formNormalized, pattern),
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
    ))

  const ids = await db.select({ id: schema.words.id }).from(schema.words)
    .where(and(
      eq(schema.words.status, 'active'),
      or(
        ilike(schema.words.headwordNormalized, pattern),
        sql`${schema.words.id} in ${matchedEntryWords}`,
      ),
    ))
    .orderBy(
      sql`(${schema.words.headwordNormalized} = ${term}) desc`,
      sql`(${schema.words.headwordNormalized} like ${term + '%'}) desc`,
      sql`similarity(${schema.words.headwordNormalized}, ${term}) desc`,
      desc(schema.words.score),
    )
    .limit(max)
  if (!ids.length) return fuzzy ? near(db, term, max) : []

  const order = new Map(ids.map((r, i) => [r.id, i]))
  const rows = await db.query.words.findMany({
    where: sql`${schema.words.id} in (${sql.join(ids.map(r => sql`${r.id}`), sql`, `)})`,
    with: { links: { with: { entry: { with: { dialect: true } } } } },
  })
  return shape(rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!))
})

/**
 * The nearest words to a term that matched nothing: trigram similarity against
 * the headwords and the dialect forms, closest first. Used only for suggestions.
 */
async function near(db: Awaited<ReturnType<typeof useDb>>, term: string, max: number) {
  const min = 0.25
  const headwordSim = sql`similarity(${schema.words.headwordNormalized}, ${term})`
  const nearEntryWords = db.select({ id: schema.wordEntryLinks.wordId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      sql`similarity(${schema.entries.formNormalized}, ${term}) > ${min}`,
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
    ))

  const ids = await db.select({ id: schema.words.id }).from(schema.words)
    .where(and(
      eq(schema.words.status, 'active'),
      or(sql`${headwordSim} > ${min}`, sql`${schema.words.id} in ${nearEntryWords}`),
    ))
    .orderBy(sql`${headwordSim} desc`, desc(schema.words.score))
    .limit(Math.min(max, 6))
  if (!ids.length) return []

  const order = new Map(ids.map((r, i) => [r.id, i]))
  const rows = await db.query.words.findMany({
    where: sql`${schema.words.id} in (${sql.join(ids.map(r => sql`${r.id}`), sql`, `)})`,
    with: { links: { with: { entry: { with: { dialect: true } } } } },
  })
  return shape(rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!))
}

/** Escapes the LIKE wildcards so a typed % or _ matches itself. */
function likeEscape(term: string) {
  return term.replace(/[\\%_]/g, c => `\\${c}`)
}

function shape(rows: any[]) {
  return rows.map(w => ({
    id: w.id, headword: w.headword, definition: w.definition, score: w.score,
    entries: w.links
      .filter((l: any) => l.status === 'active' && l.entry.status === 'active')
      .sort((a: any, b: any) => b.score - a.score)
      .map((l: any) => ({ id: l.entry.id, form: l.entry.form, dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr } })),
  }))
}
