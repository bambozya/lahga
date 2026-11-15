import { looseArabicKey, normalizeArabic } from './arabic'

/**
 * The house style for `entries.form` (#46): one conventional spelling per
 * dialect word, following CODA* (Habash et al., LREC 2018,
 * https://aclanthology.org/L18-1574/). The rules that decide most cases are
 * on /spelling; this file holds the ones a script can check, so the review
 * pass over the existing forms (scripts/coda-flags.ts) and the page agree.
 *
 * A flag is a lead for a reviewer, never an automatic change: the form may
 * be a foreign word that keeps its گ, or a ه that really is a ه.
 */

export type CodaRule = 'gaf' | 'etymological' | 'taa-marbuta' | 'negation'

export interface CodaFlag {
  rule: CodaRule
  /** What the house style would write, when it can be guessed. */
  suggestion: string | null
  /** Why: the spelling elsewhere in the dictionary the guess leans on, if any. */
  evidence: string | null
}

/** Letters dialect writers use for /g/ where the origin has ق; CODA* keeps ق and the sound goes to the pronunciation field. */
export const GAF_LETTERS = /[گڨݣ]/g

/** Negated pronouns keep ما attached (CODA* 6.4.4): ما + pronoun stem, no repeated alef. */
const NEGATED_PRONOUNS = new Set(['مانيش', 'ماهوش', 'ماهيش', 'ماحناش', 'ماهمش', 'مانتاش', 'مانتيش', 'مانتوش', 'مانتمش', 'ماناش', 'ماهياش', 'ماهواش', 'ماحنيش', 'مالناش', 'ماليش', 'مالوش', 'مالهاش', 'مالهمش', 'مالكش', 'مالكمش', 'ماعندوش', 'ماعنديش', 'ماعندهاش', 'ماعندكش', 'ماعندناش', 'ماعندهمش', 'ماعندكمش', 'ماعليش', 'مافيش', 'مافيهش', 'مافيهاش'])

/**
 * The spellings the dictionary already holds that a form's letters could be
 * folded into: the headword and the other forms of the same word, by the
 * loose key search uses (ت/ث, د/ذ, ض/ظ, ق/گ, a final ا/ي/ه). Given to
 * codaFlags() so a guess can point at a spelling that exists, not invent one.
 */
export type Neighbours = { headword: string, forms: string[] }

const ETYMOLOGICAL = /[ثذظق]/

/**
 * What the house style would question in one form. Order matters: a form
 * gets every flag that applies, so a reviewer sees the whole case at once.
 */
export function codaFlags(form: string, near: Neighbours = { headword: '', forms: [] }): CodaFlag[] {
  const flags: CodaFlag[] = []
  // Every other spelling the dictionary holds for this word, the form itself excepted.
  const candidates = [near.headword, ...near.forms].filter(c => c && c !== form)
  const key = looseArabicKey(normalizeArabic(form))
  // A spelling with the same loose key but the etymological letters: the guess.
  const twin = candidates.find(c => looseArabicKey(normalizeArabic(c)) === key && ETYMOLOGICAL.test(c) && normalizeArabic(c) !== normalizeArabic(form))

  if (GAF_LETTERS.test(form)) {
    GAF_LETTERS.lastIndex = 0
    const guess = form.replace(GAF_LETTERS, 'ق')
    flags.push({ rule: 'gaf', suggestion: guess, evidence: twin ?? null })
  }
  else if (twin && !ETYMOLOGICAL.test(form) && /[تدضز]/.test(form)) {
    // تلاتة beside ثلاثة, دهب beside ذهب: the sound changed, the letter should not.
    flags.push({ rule: 'etymological', suggestion: twin, evidence: twin })
  }

  if (/ه$/.test(form)) {
    // مدرسه for مدرسة: a final ه where the word the dictionary knows ends in ة.
    const taa = candidates.find(c => normalizeArabic(c) === normalizeArabic(form) && /ة$/.test(c))
    if (taa) flags.push({ rule: 'taa-marbuta', suggestion: form.replace(/ه$/, 'ة'), evidence: taa })
  }

  for (const word of form.split(' ')) {
    // ماقالش, مابيقولهاش: the negation particle ما is a word of its own (CODA* 6.4.4), except on a pronoun.
    if (/^ما[^\s]{2,}ش$/.test(word) && !NEGATED_PRONOUNS.has(normalizeArabic(word).replace(/^ما/, 'ما'))) {
      flags.push({ rule: 'negation', suggestion: form.replace(word, `ما ${word.slice(2)}`), evidence: null })
      break
    }
  }
  return flags
}

/** The rules, named for a report. */
export const CODA_RULE_LABELS: Record<CodaRule, string> = {
  'gaf': 'گ ڨ ݣ for a historical ق',
  'etymological': 'ت د ض ز for a historical ث ذ ظ ق',
  'taa-marbuta': 'final ه for ة',
  'negation': 'ما attached to the verb',
}
