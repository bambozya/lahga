/**
 * Arabic text helpers shared by the client and the server.
 */

// Tashkeel (harakat), superscript alef, and tatweel.
const DIACRITICS = /[ً-ْٰـ]/g

/**
 * Normalises Arabic text for indexing and searching.
 * The original spelling is always stored and displayed; only the index uses this.
 */
export function normalizeArabic(input: string): string {
  return input
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The "Arabic script only" rule. Allows Arabic blocks, digits (both kinds),
 * whitespace and common punctuation. Any Latin letter fails.
 */
const ALLOWED = /^[؀-ۿݐ-ݿࢠ-ࣿ٠-٩۰-۹0-9\s.,;:!?()\-«»"'…؟،؛]*$/

export function isArabicOnly(input: string): boolean {
  return ALLOWED.test(input.normalize('NFKC'))
}

export function assertArabic(field: string, value: string | null | undefined): void {
  if (value == null || value === '') return
  if (!isArabicOnly(value)) {
    throw createError({ statusCode: 400, statusMessage: `الحقل "${field}" يجب أن يكون بالحروف العربية فقط` })
  }
}

/**
 * A word's slug (docs/REACH.md, Phase R5): the headword itself, made fit for
 * a URL path segment — `/w/سيارة` rather than `/w/123`. Browsers and WhatsApp
 * render the Arabic in a preview even though the href is percent-encoded, so
 * unlike normalizeArabic() above this keeps the real spelling — ة stays ة,
 * ى stays ى — and only strips what a URL cannot carry cleanly: diacritics
 * (fragile once percent-encoded, and invisible to a reader either way),
 * spaces (become hyphens, so a phrase headword does not turn into
 * percent-encoded %20s), and punctuation (a slug that ends in «؟» reads
 * strangely once it is a link rather than a sentence).
 *
 * Never unique by itself — a homograph is a real possibility in a dictionary
 * this size — so the caller appends -2, -3, … on collision.
 */
export function slugify(headword: string): string {
  return headword
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/[.,;:!?()\-«»"'…؟،؛]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
