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
 * A forgiving second try for a search that found nothing (server/api/words).
 * Turns a normalised term into a regular expression that also accepts the
 * spellings people drift between when they write a dialect word:
 *
 *   - a leading ال (or وال، بال، فال، كال، لل) is dropped from each word, so
 *     «الغريب» finds «غريب»; the substring match already covers the reverse;
 *   - ت/ث, د/ذ, ض/ظ and ق/گ count as one letter: كمترة is how Cairo spells كمثرة,
 *     گريب how Baghdad spells قريب;
 *   - a word-final ا، ي، ه count as one letter (normalizeArabic has already made
 *     ى into ي and ة into ه), so كمترا، كمترى and كمترة meet.
 *
 * Returns null when a word is left with under two letters, or when the loose
 * form is no different from the term (the first search already tried it).
 */
export function looseArabicPattern(term: string): string | null {
  // ال comes off only if three letters stay: «الله» is not «ال» + «له».
  const words = term.split(' ').map(w => w.replace(/^(?:[وفبك]?ال|لل)(?=...)/, ''))
  if (!words.every(w => w.length >= 2)) return null
  const letter: Record<string, string> = { ت: '[تث]', ث: '[تث]', د: '[دذ]', ذ: '[دذ]', ض: '[ضظ]', ظ: '[ضظ]', ق: '[قگ]', گ: '[قگ]' }
  const escape = (c: string) => /[\\^$.|?*+()[\]{}-]/.test(c) ? `\\${c}` : c
  const pattern = words.map(w => [...w].map((c, i) => {
    // A two-letter word keeps its last letter: «لا» and «له» are different words.
    if (w.length >= 3 && i === w.length - 1 && 'ايه'.includes(c)) return '[ايه]'
    return letter[c] ?? escape(c)
  }).join('')).join(' ')
  return pattern === term ? null : pattern
}

/**
 * A normalised form folded by the same equivalences as looseArabicPattern():
 * two forms with the same key are one word spelled two ways, not two words.
 * «كمترة» and «كمثرى» share a key; «بندورة» and «طماطم» do not.
 */
export function looseArabicKey(normalized: string): string {
  const letter: Record<string, string> = { ث: 'ت', ذ: 'د', ظ: 'ض', گ: 'ق' }
  return normalized.split(' ')
    .map(w => w.replace(/^(?:[وفبك]?ال|لل)(?=...)/, ''))
    .map(w => [...w].map((c, i) => {
      if (w.length >= 3 && i === w.length - 1 && 'ايه'.includes(c)) return 'ا'
      return letter[c] ?? c
    }).join(''))
    .join(' ')
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

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Renders a number with Arabic-Indic digits: «١٨», not «18». */
export function arabicDigits(n: number): string {
  return String(n).replace(/[0-9]/g, d => ARABIC_DIGITS[+d]!)
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
