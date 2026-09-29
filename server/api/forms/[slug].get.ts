import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { formKey } from '../../../shared/utils/arabic'

/**
 * A dialect form's own page (server/utils/forms.ts): every meaning the
 * spelling has, who says it, how the other dialects say the same thing, and
 * the phrases that use it. Reached by any spelling that shares its key; the
 * page redirects to the canonical `slug` this returns.
 */
export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'slug', { decode: true })!
  const key = formKey(param.replace(/-/g, ' '))
  if (!key || key.length > 100) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  // Generous: nine thousand of these pages are new to the crawlers at once, and
  // a first visit is uncached (the page's own SSR fetch spends the same bucket).
  assertRateLimit(`forms:${clientIp(event)}`, 600, 60 * 1000)
  const db = await useDb()

  const matched = await db.select({ id: schema.entries.id }).from(schema.entries)
    .where(and(eq(schema.entries.status, 'active'), sql`${formKeySql(schema.entries.formNormalized)} = ${key}`))
  if (!matched.length) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  const rows = await db.query.entries.findMany({
    where: inArray(schema.entries.id, matched.map(m => m.id)),
    with: { dialect: { with: { parent: true } }, examples: true, links: { with: { word: true } } },
  })

  // One sense per MSA word the spelling links to, each with the dialects that
  // use it in that sense. A form in two words (عيش: خبز and أرز) is two senses.
  type Sense = {
    word: { id: number, slug: string | null, headword: string, definition: string | null, kind: string }
    draft: boolean
    entries: {
      id: number, form: string, meaning: string | null, notes: string | null, draft: boolean, rank: number, score: number
      dialect: { slug: string, nameAr: string, top: boolean }
      examples: { id: number, text: string, gloss: string | null }[]
    }[]
  }
  const senses = new Map<number, Sense>()
  for (const e of rows) {
    for (const l of e.links) {
      if (l.status !== 'active' || l.word.status !== 'active') continue
      const s = senses.get(l.word.id) ?? senses.set(l.word.id, {
        word: { id: l.word.id, slug: l.word.slug, headword: l.word.headword, definition: l.word.definition, kind: l.word.kind },
        draft: true,
        entries: [],
      }).get(l.word.id)!
      if (!l.needsReview) s.draft = false
      s.entries.push({
        id: e.id, form: e.form, meaning: e.meaning, notes: e.notes, draft: l.needsReview,
        rank: wilson(e.upvotes, e.downvotes), score: e.score,
        // A region (مصري) is named before a city inside it (قاهري).
        dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr, top: e.dialect.parentId === null },
        examples: e.examples.filter(x => x.status === 'active').sort((a, b) => b.score - a.score)
          .map(x => ({ id: x.id, text: x.text, gloss: x.gloss })),
      })
    }
  }
  if (!senses.size) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  // Checked senses first, then the best-supported.
  const ordered = [...senses.values()]
    .map(s => ({ ...s, entries: s.entries.sort((a, b) => Number(a.draft) - Number(b.draft) || b.rank - a.rank) }))
    .sort((a, b) => Number(a.draft) - Number(b.draft) || (b.entries[0]?.rank ?? 0) - (a.entries[0]?.rank ?? 0))
  const wordIds = ordered.map(s => s.word.id)

  // The same meaning in the other dialects: every other spelling linked to
  // the same MSA words, each once with everyone who says it.
  const siblings = await db.query.wordEntryLinks.findMany({
    where: and(inArray(schema.wordEntryLinks.wordId, wordIds), eq(schema.wordEntryLinks.status, 'active')),
    with: { entry: { with: { dialect: true } } },
  })
  const others = new Map<number, Map<string, { form: string, dialects: string[], draft: boolean, rank: number }>>()
  for (const l of siblings) {
    if (l.entry.status !== 'active') continue
    const k = formKey(l.entry.form)
    if (k === key) continue
    const forWord = others.get(l.wordId) ?? others.set(l.wordId, new Map()).get(l.wordId)!
    const o = forWord.get(k) ?? forWord.set(k, { form: l.entry.form, dialects: [], draft: true, rank: 0 }).get(k)!
    if (!o.dialects.includes(l.entry.dialect.nameAr)) o.dialects.push(l.entry.dialect.nameAr)
    if (!l.needsReview) o.draft = false
    o.rank = Math.max(o.rank, wilson(l.entry.upvotes, l.entry.downvotes))
  }

  // Phrases that use the spelling as a whole word: «لحد دلوقتي»، «دلوقتي حالاً».
  // The trigram index narrows it; the token check keeps «بس» out of «بسكوت».
  const tokens = key.split(' ')
  const within = (k: string) => {
    const t = k.split(' ')
    return t.length > tokens.length && t.some((_, i) => tokens.every((w, j) => t[i + j] === w))
  }
  const near = await db.query.entries.findMany({
    where: and(eq(schema.entries.status, 'active'), ilike(schema.entries.formNormalized, `%${key.replace(/[\\%_]/g, c => `\\${c}`)}%`)),
    orderBy: desc(schema.entries.score),
    limit: 200,
    with: { dialect: true, links: { with: { word: true } } },
  })
  const phrases = new Map<string, { form: string, dialects: string[], headword: string, wordSlug: string | null, draft: boolean }>()
  for (const e of near) {
    const k = formKey(e.form)
    const live = e.links.filter(l => l.status === 'active' && l.word.status === 'active')
    const link = live.find(l => !l.needsReview) ?? live[0]
    if (!link || !within(k)) continue
    const p = phrases.get(k) ?? phrases.set(k, { form: e.form, dialects: [], headword: link.word.headword, wordSlug: link.word.slug, draft: true }).get(k)!
    if (!p.dialects.includes(e.dialect.nameAr)) p.dialects.push(e.dialect.nameAr)
    if (!link.needsReview) p.draft = false
  }

  // Counted per link, as the sitemap counts them (indexableForms), so the
  // address listed there is the one this page settles on.
  const form = canonicalForm(ordered.flatMap(s => s.entries))
  return {
    form,
    slug: formSlug(form),
    indexable: isIndexable(key, ordered.map(s => ({ headword: s.word.headword, draft: s.draft }))),
    senses: ordered.map(s => ({
      ...s,
      others: [...(others.get(s.word.id)?.values() ?? [])]
        .sort((a, b) => Number(a.draft) - Number(b.draft) || b.rank - a.rank)
        .slice(0, 16)
        .map(({ rank, ...o }) => o),
      entries: s.entries.map(({ rank, score, ...e }) => e),
    })),
    phrases: [...phrases.values()].sort((a, b) => Number(a.draft) - Number(b.draft)).slice(0, 12),
  }
})
