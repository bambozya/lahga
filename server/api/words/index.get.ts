import type { H3Event } from 'h3'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { AnyColumn, SQL } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { looseArabicPattern, normalizeArabic } from '../../../shared/utils/arabic'

/**
 * List words, newest first, or search them.
 * ?q= matches the MSA headword or any linked dialect form (normalised, prefix + substring);
 * if that finds nothing, once more with looser spelling (looseArabicPattern).
 * ?fuzzy=1 answers a search that found nothing with the nearest words instead
 * (trigram similarity), so the empty result can still offer a way forward.
 * ?random=1 draws a handful at random instead of the newest: what the home page
 * shows when nobody is searching, and what the shuffle button asks for again.
 */
export default defineEventHandler(async (event) => {
  const { q, limit, fuzzy, random } = getQuery(event)
  const max = limitParam(limit, 20, 50)
  const raw = searchTerm(q)
  const term = normalizeArabic(raw)

  // Two limits, because the two halves of this route cost very different things.
  // Both are also spent by the home page rendering on the server — that render
  // calls this handler, and an empty search calls it twice, once for the results
  // and once for the «هل تقصد» suggestions — which is the point: a search costs
  // the database the same whether a browser or our own renderer asked for it.
  const ip = clientIp(event)
  assertRateLimit(`words:${ip}`, 240, 60 * 1000)
  // Trigram matching across every headword and every dialect form, twice over
  // when nothing is found. The only public route that does real work per request.
  if (term) assertRateLimit(`words-search:${ip}`, 90, 60 * 1000)

  const db = await useDb()
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
      with: { links: { with: { entry: { with: { dialect: { with: { parent: true } } } } } } },
    }).then(shape)
  }

  // Substring match on the trigram-indexed columns (migration 0005), best matches first:
  // an exact headword, then a headword starting with the term, then by trigram similarity.
  // % and _ are wildcards in LIKE, so a search for them is a search for those
  // characters, not for everything.
  const pattern = `%${likeEscape(term)}%`
  let ids = await matchingIds(db, col => ilike(col, pattern), term, max)
  // Nothing: try once more with the looser spelling (optional ال, ت/ث and the
  // like, a final ا/ى/ة). Only now, so an exact hit is never crowded out by
  // near-spellings, and a term only counts as missing if both tries fail.
  const loose = ids.length ? null : looseArabicPattern(term)
  if (loose) ids = await matchingIds(db, col => sql`${col} ~ ${loose}`, term, max)
  if (!ids.length) {
    // The fuzzy call is the home page asking a second time about a term it
    // has just been told is missing; logging it too would count every miss twice.
    if (!fuzzy) await logSearchMiss(event, db, raw, term)
    return fuzzy ? near(db, term, max) : []
  }

  const order = new Map(ids.map((r, i) => [r.id, i]))
  const rows = await db.query.words.findMany({
    where: sql`${schema.words.id} in (${sql.join(ids.map(r => sql`${r.id}`), sql`, `)})`,
    with: { links: { with: { entry: { with: { dialect: { with: { parent: true } } } } } } },
  })
  return shape(rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!))
})

/**
 * Ids of the active words whose headword or an active linked dialect form
 * satisfies `match`, best first: an exact headword, then a word the term is
 * a dialect form of (عيش finds خبز and أرز before «ما عندي نقود», which only
 * holds it inside معيش), then a headword starting with the term, then by
 * trigram similarity, then by score.
 */
async function matchingIds(db: Awaited<ReturnType<typeof useDb>>, match: (col: AnyColumn) => SQL, term: string, max: number) {
  const matchedEntryWords = db.select({ id: schema.wordEntryLinks.wordId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      match(schema.entries.formNormalized),
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
    ))

  const exactFormWords = db.select({ id: schema.wordEntryLinks.wordId })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      eq(schema.entries.formNormalized, term),
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
    ))

  return db.select({ id: schema.words.id }).from(schema.words)
    .where(and(
      eq(schema.words.status, 'active'),
      or(
        match(schema.words.headwordNormalized),
        sql`${schema.words.id} in ${matchedEntryWords}`,
      ),
    ))
    .orderBy(
      sql`(${schema.words.headwordNormalized} = ${term}) desc`,
      sql`(${schema.words.id} in ${exactFormWords}) desc`,
      sql`(${schema.words.headwordNormalized} like ${term + '%'}) desc`,
      sql`similarity(${schema.words.headwordNormalized}, ${term}) desc`,
      desc(schema.words.score),
    )
    .limit(max)
}

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
    with: { links: { with: { entry: { with: { dialect: { with: { parent: true } } } } } } },
  })
  return shape(rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!))
}

/**
 * Records a search that matched nothing, upserted by normalised term so this
 * stays a ranked list of missing words (docs/REACH.md, Phase R1), plus one
 * event row with coarse facts about who searched (server/utils/searchVisitor.ts).
 * Skipped for very short terms, which are mostly a typo still being typed.
 * Never lets a logging failure break the search itself.
 */
async function logSearchMiss(event: H3Event, db: Awaited<ReturnType<typeof useDb>>, raw: string, term: string) {
  if (term.length < 2) return
  try {
    const [miss] = await db.insert(schema.searchMisses)
      .values({ term: raw.slice(0, 200), termNormalized: term })
      .onConflictDoUpdate({
        target: schema.searchMisses.termNormalized,
        set: { count: sql`${schema.searchMisses.count} + 1`, lastSearchedAt: new Date() },
      })
      .returning({ id: schema.searchMisses.id })
    await db.insert(schema.searchMissEvents).values({ missId: miss!.id, ...describeSearcher(event) })
    await pruneSearchMissEvents(db)
  } catch (e) { console.error('[lahga] search miss not logged', e) }
}

/** Escapes the LIKE wildcards so a typed % or _ matches itself. */
function likeEscape(term: string) {
  return term.replace(/[\\%_]/g, c => `\\${c}`)
}

function shape(rows: any[]) {
  return rows.map(w => ({
    id: w.id, slug: w.slug, headword: w.headword, definition: w.definition, score: w.score,
    entries: cardEntries(w.links),
  }))
}

/**
 * The dialect forms a result card shows: flat, but in the word page's own
 * order, so a card and the page it opens name the forms in the same sequence.
 */
function cardEntries(links: any[]) {
  const entries = links
    .filter(l => l.status === 'active' && l.entry.status === 'active')
    .map(l => ({
      id: l.entry.id as number,
      form: l.entry.form as string,
      score: l.entry.score as number,
      rank: wilson(l.entry.upvotes, l.entry.downvotes),
      dialect: { slug: l.entry.dialect.slug as string, nameAr: l.entry.dialect.nameAr as string },
      group: l.entry.dialect.parent
        ? { slug: l.entry.dialect.parent.slug as string, nameAr: l.entry.dialect.parent.nameAr as string }
        : { slug: l.entry.dialect.slug as string, nameAr: l.entry.dialect.nameAr as string },
    }))
  return groupByRegion(entries)
    .flatMap(g => g.entries)
    .map(e => ({ id: e.id, form: e.form, dialect: e.dialect }))
}
