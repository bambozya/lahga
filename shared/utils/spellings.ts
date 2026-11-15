import { bareForm, normalizeArabic } from './arabic'
import { MAX_SPELLINGS } from '../config/rules'

/**
 * The other ways a dialect form is written (entry_spellings): Darija *had* is
 * هذا، هدا، هاد، هاذ، هد، هذ, and every one of them should lead to the entry.
 * The main `form` is the canonical spelling (#46, CODA*); these are the
 * variants under it. The site's forms take them as one comma-separated line;
 * the API takes a list.
 */

/** One typed line into a list: «هاد، هد» → ['هاد', 'هد']. Either comma, or a line break. */
export function splitSpellings(text: string): string[] {
  return text.split(/[،,;؛\n]+/).map(bareForm).filter(Boolean)
}

/** The list as the forms show it, for editing. */
export const joinSpellings = (list: string[]) => list.join('، ')

/**
 * What is stored for an entry: each spelling bare (no harakat), once, never
 * the main form itself (nor what search already treats as the same spelling),
 * at most MAX_SPELLINGS, in the order given.
 */
export function resolveSpellings(form: string, list: string[]): string[] {
  const seen = new Set([normalizeArabic(form)])
  const out: string[] = []
  for (const raw of list) {
    const s = bareForm(raw)
    const k = normalizeArabic(s)
    if (!s || seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out.slice(0, MAX_SPELLINGS)
}
