import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * Two dialects side by side: the words they say differently (docs/REACH.md,
 * Phase R4).
 *
 * "Differently" is decided on normalised forms, so a difference in tashkeel or
 * a stray hamza is not mistaken for disagreement. A word counts as shared when
 * both sides say it at all, and as different when the two sides have no
 * normalised form in common — if either side also says the other's word, they
 * agree, and the pair is not interesting.
 *
 * Each side is a dialect plus its sub-dialects, the same way a dialect page
 * counts its words, so comparing خليجي with مغاربي compares the regions rather
 * than two arbitrary points inside them.
 *
 * Lives under /api/compare rather than /api/dialects so that the dialect
 * page's own `useFetch('/api/dialects/' + slug)` keeps a single, narrow type.
 */
export const MIN_SHARED = 40

export default defineEventHandler(async (event) => {
  const aSlug = getRouterParam(event, 'a')!
  const bSlug = getRouterParam(event, 'b')!
  if (aSlug === bSlug) throw createError({ statusCode: 404, statusMessage: 'اللهجتان واحدة' })
  const db = await useDb()

  const [a, b] = await Promise.all([
    db.query.dialects.findFirst({ where: eq(schema.dialects.slug, aSlug), with: { children: true } }),
    db.query.dialects.findFirst({ where: eq(schema.dialects.slug, bSlug), with: { children: true } }),
  ])
  if (!a || !b) throw createError({ statusCode: 404, statusMessage: 'اللهجة غير موجودة' })

  const aIds = [a.id, ...a.children.map(c => c.id)]
  const bIds = [b.id, ...b.children.map(c => c.id)]

  const rows = await db.select({
    wordId: schema.wordEntryLinks.wordId,
    headword: schema.words.headword,
    definition: schema.words.definition,
    dialectId: schema.entries.dialectId,
    form: schema.entries.form,
    formNormalized: schema.entries.formNormalized,
  })
    .from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .innerJoin(schema.words, eq(schema.words.id, schema.wordEntryLinks.wordId))
    .where(and(
      inArray(schema.entries.dialectId, [...aIds, ...bIds]),
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
      eq(schema.words.status, 'active'),
    ))

  type Side = { forms: string[], normalized: Set<string> }
  const words = new Map<number, { headword: string, definition: string | null, a: Side, b: Side }>()
  const aSet = new Set(aIds)
  for (const r of rows) {
    const w = words.get(r.wordId) ?? words.set(r.wordId, {
      headword: r.headword, definition: r.definition,
      a: { forms: [], normalized: new Set() }, b: { forms: [], normalized: new Set() },
    }).get(r.wordId)!
    const side = aSet.has(r.dialectId) ? w.a : w.b
    if (!side.normalized.has(r.formNormalized)) {
      side.normalized.add(r.formNormalized)
      side.forms.push(r.form)
    }
  }

  const shared = [...words.values()].filter(w => w.a.forms.length && w.b.forms.length)
  const different = shared
    .filter(w => ![...w.a.normalized].some(f => w.b.normalized.has(f)))
    .map(w => ({ headword: w.headword, definition: w.definition, a: w.a.forms, b: w.b.forms }))

  return {
    a: { slug: a.slug, nameAr: a.nameAr },
    b: { slug: b.slug, nameAr: b.nameAr },
    shared: shared.length,
    // Below this the pair has too little in common to be worth indexing; the
    // page still answers, it just asks not to be listed (see the page).
    enoughToIndex: shared.length >= MIN_SHARED,
    words: different.sort((x, y) => x.headword.localeCompare(y.headword, 'ar')),
  }
})
