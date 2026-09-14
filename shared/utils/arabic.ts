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
