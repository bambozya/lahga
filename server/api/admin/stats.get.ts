import { and, count, countDistinct, eq, gt } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * How big the dictionary is, for the admin's "الأرقام" page: how many
 * headwords, how many dialect forms, and how each dialect is covered.
 *
 * Everything counts live content only: an active entry, linked by an active
 * link to an active word. A form that sits on two headwords (زين on both جيد
 * and جميل) is one row in `entries` but two dialect forms in the dictionary,
 * so `forms` counts links and `entryRows` counts rows; the difference is how
 * much the link table is doing.
 *
 * Per dialect, `words` is how many headwords the dialect has at least one
 * form for, and `forms - words` is therefore its count of same-dialect
 * synonyms. Sub-dialects are reported on their own and also folded into their
 * region, since a dialect page shows its children's words as its own.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()

  const live = and(
    eq(schema.entries.status, 'active'),
    eq(schema.wordEntryLinks.status, 'active'),
    eq(schema.words.status, 'active'),
  )
  const [byKind, perDialect, synonymPairs, examples, dialects] = await Promise.all([
    db.select({ kind: schema.words.kind, n: count() }).from(schema.words)
      .where(eq(schema.words.status, 'active')).groupBy(schema.words.kind),
    db.select({
      dialectId: schema.entries.dialectId,
      forms: count(),
      entryRows: countDistinct(schema.entries.id),
      words: countDistinct(schema.wordEntryLinks.wordId),
    }).from(schema.entries)
      .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
      .innerJoin(schema.words, eq(schema.words.id, schema.wordEntryLinks.wordId))
      .where(live)
      .groupBy(schema.entries.dialectId),
    // (word, dialect) pairs with more than one form: the words that carry a synonym.
    db.select({ wordId: schema.wordEntryLinks.wordId, n: count() }).from(schema.entries)
      .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
      .innerJoin(schema.words, eq(schema.words.id, schema.wordEntryLinks.wordId))
      .where(live)
      .groupBy(schema.wordEntryLinks.wordId, schema.entries.dialectId)
      .having(gt(count(), 1)),
    db.select({ n: count() }).from(schema.examples)
      .innerJoin(schema.entries, eq(schema.entries.id, schema.examples.entryId))
      .where(and(eq(schema.examples.status, 'active'), eq(schema.entries.status, 'active'))),
    db.select().from(schema.dialects).where(eq(schema.dialects.active, 1)).orderBy(schema.dialects.sortOrder),
  ])

  const words = byKind.reduce((n, r) => n + Number(r.n), 0)
  const kinds = Object.fromEntries(byKind.map(r => [r.kind, Number(r.n)])) as Record<'word' | 'phrase' | 'proverb', number | undefined>
  const forms = perDialect.reduce((n, r) => n + Number(r.forms), 0)

  // Rows in `entries` are shared across dialect groups only within one
  // dialect, so summing the per-dialect distinct counts gives the total.
  const entryRows = perDialect.reduce((n, r) => n + Number(r.entryRows), 0)

  const counted = new Map(perDialect.map(r => [r.dialectId, { forms: Number(r.forms), words: Number(r.words) }]))
  const row = (d: typeof dialects[number]) => ({
    slug: d.slug, nameAr: d.nameAr,
    forms: counted.get(d.id)?.forms ?? 0,
    words: counted.get(d.id)?.words ?? 0,
  })
  // A region's forms are its own plus its children's. Its `words` is not that
  // sum (a headword said in both مصري and قاهري counts once), so the region
  // row carries only what is exact and the per-dialect rows carry the rest.
  const regions = dialects.filter(d => d.parentId === null).map((g) => {
    const children = dialects.filter(d => d.parentId === g.id).map(row)
    const own = row(g)
    return { slug: g.slug, nameAr: g.nameAr, forms: own.forms + children.reduce((n, c) => n + c.forms, 0), own, children }
  })

  return {
    words,
    kinds: { word: kinds.word ?? 0, phrase: kinds.phrase ?? 0, proverb: kinds.proverb ?? 0 },
    forms,
    entryRows,
    wordsWithSynonyms: new Set(synonymPairs.map(r => r.wordId)).size,
    examples: Number(examples[0]?.n ?? 0),
    regions,
  }
})
