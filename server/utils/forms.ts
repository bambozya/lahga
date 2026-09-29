import { and, eq, sql } from 'drizzle-orm'
import type { AnyColumn } from 'drizzle-orm'
import { schema } from '../db'
import type { useDb } from '../db'
import { formKey, slugify, SLUG_PUNCTUATION } from '../../shared/utils/arabic'

/**
 * A dialect form's own page (/f/دلوقتي): the other way into the dictionary.
 * A word page answers «how do you say الآن in the dialects?»; a form page
 * answers «what does دلوقتي mean?», which is what people type into a search
 * box when they hear a word they do not know.
 *
 * One page per spelling, not per dialect: «للحين» is Gulf and Najdi alike,
 * and «عيش» is bread in Cairo and rice in the Gulf — one page says both.
 */

/** formKey() in SQL, computed from entries.form_normalized (already normalised). */
export const formKeySql = (col: AnyColumn) =>
  sql`btrim(regexp_replace(translate(${col}, ${SLUG_PUNCTUATION}, ''), ${'\\s+'}, ' ', 'g'))`

/**
 * The spelling a page is titled and addressed by, when several meet on one
 * key (هلق، هلّق): the one written most often, then the best-supported.
 */
export function canonicalForm(rows: { form: string, score: number }[]): string {
  const tally = new Map<string, { n: number, score: number }>()
  for (const r of rows) {
    const t = tally.get(r.form) ?? tally.set(r.form, { n: 0, score: -Infinity }).get(r.form)!
    t.n++
    t.score = Math.max(t.score, r.score)
  }
  return [...tally.entries()].sort(([a, x], [b, y]) => y.n - x.n || y.score - x.score || a.localeCompare(b))[0]![0]
}

/** A form's address: the spelling itself, as a word's slug is its headword. */
export const formSlug = (form: string) => slugify(form)

/**
 * Whether a form page may be offered to search engines (the content rule,
 * README.md): only if at least one of its meanings is a spelling
 * the MSA word does not already have — «معنى أرجوحة: أرجوحة» says nothing —
 * and has been checked by a speaker, since an unconfirmed language-model
 * draft is shown on the site with a mark but must not be what a stranger's
 * search lands on. Everything else still answers, as `noindex`.
 */
export function isIndexable(key: string, senses: { headword: string, draft: boolean }[]) {
  return senses.some(s => !s.draft && formKey(s.headword) !== key)
}

type Db = Awaited<ReturnType<typeof useDb>>

/** Every form page the sitemap lists: its slug, and only the indexable ones. */
export async function indexableForms(db: Db) {
  const rows = await db.select({
    form: schema.entries.form,
    score: schema.entries.score,
    headword: schema.words.headword,
    draft: schema.wordEntryLinks.needsReview,
  })
    .from(schema.wordEntryLinks)
    .innerJoin(schema.entries, eq(schema.entries.id, schema.wordEntryLinks.entryId))
    .innerJoin(schema.words, eq(schema.words.id, schema.wordEntryLinks.wordId))
    .where(and(
      eq(schema.wordEntryLinks.status, 'active'),
      eq(schema.entries.status, 'active'),
      eq(schema.words.status, 'active'),
    ))

  const byKey = new Map<string, typeof rows>()
  for (const r of rows) {
    const key = formKey(r.form)
    if (!key) continue
    const list = byKey.get(key) ?? byKey.set(key, []).get(key)!
    list.push(r)
  }
  return [...byKey.entries()]
    .filter(([key, list]) => isIndexable(key, list))
    .map(([, list]) => formSlug(canonicalForm(list)))
}
