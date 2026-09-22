import { normalizeArabic } from '../../shared/utils/arabic'

/**
 * How many forms one dialect may contribute to a word from an imported source.
 *
 * Maknuune lists every Palestinian word for a meaning — مجنون came with 21 —
 * and a page where one dialect fills two screens stops being a comparison.
 * Two is enough to show the dialect; the rest is for a "more forms" view the
 * site does not have. Hand-written forms are never touched by this cap, but
 * they count toward it.
 */
export const MAX_IMPORTED_FORMS_PER_DIALECT = 2

export type CapEntry = { form: string, examples?: unknown[] }

/** Ignores the definite article and spelling drift: «مجنون» echoes «المجنون». */
const bare = (s: string) => normalizeArabic(s).replace(/^(ال|لل)/, '').trim()

/**
 * Picks which imported forms stay. Least worth keeping goes first:
 * a form that only repeats the headword, then a multi-word phrase (a saying,
 * not a word), then a bare form; a form with an example beats one without.
 * Ties keep the source's own order.
 */
export function capImportedForms<T extends CapEntry>(headword: string, handwritten: number, imported: T[]): { keep: T[], drop: T[] } {
  const rank = (e: T) => {
    if (bare(e.form) === bare(headword)) return 0
    if (/\s/.test(e.form.trim())) return 1
    return e.examples?.length ? 3 : 2
  }
  const ordered = imported.map((e, i) => ({ e, i, r: rank(e) })).sort((a, b) => b.r - a.r || a.i - b.i)
  const room = Math.max(0, MAX_IMPORTED_FORMS_PER_DIALECT - handwritten)
  const keepSet = new Set(ordered.slice(0, room).map(x => x.e))
  return {
    keep: imported.filter(e => keepSet.has(e)),
    drop: imported.filter(e => !keepSet.has(e)),
  }
}
