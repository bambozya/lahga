/**
 * The dialect forms of a word, one line per distinct form, with every dialect
 * that says it: «الحين» خليجي، نجدي. Thirty entries are rarely thirty answers,
 * and repeating a form once per dialect hides that.
 *
 * The first entry that says it carries the line, so a list of forms doubles as
 * a table of contents for the detail below it.
 */
export function formsOf(entries: { id: number, form: string, formVocalized?: string | null, dialect: { nameAr: string }, needsReview?: boolean }[]) {
  const byForm = new Map<string, { form: string, formVocalized: string | null, entryId: number, dialects: string[], draft: boolean }>()
  for (const e of entries) {
    const seen = byForm.get(e.form) ?? byForm.set(e.form, { form: e.form, formVocalized: null, entryId: e.id, dialects: [], draft: true }).get(e.form)!
    // The first entry to carry the harakat lends them to the line.
    seen.formVocalized ??= e.formVocalized ?? null
    if (!seen.dialects.includes(e.dialect.nameAr)) seen.dialects.push(e.dialect.nameAr)
    // A line is a draft only while every dialect behind it is: one checked
    // speaker of the form is enough to write it plainly.
    if (!e.needsReview) seen.draft = false
  }
  return [...byForm.values()]
}

/**
 * How a form is written where it is a title: with its harakat when a speaker
 * added them (يِغَنِّج), bare otherwise. Links and keys keep using `form`.
 */
export const shown = (e: { form: string, formVocalized?: string | null }) => e.formVocalized || e.form

/** A dialect form's own page (/f/…, server/utils/forms.ts). */
export const formPath = (form: string) => `/f/${slugify(form)}`

type Said = { entries: { dialect: { nameAr: string, top: boolean } }[] }

/** Everyone who says a form, regions before the cities inside them: «مصري، قاهري». */
export function namesOf(senses: Said[]) {
  const dialects = senses.flatMap(s => s.entries.map(e => e.dialect)).sort((a, b) => Number(b.top) - Number(a.top))
  return [...new Set(dialects.map(d => d.nameAr))]
}

/** Who means a form in one sense, two names at most so a line stays a line: «أرز (خليجي، نجدي)». */
export function whoSays(sense: Said) {
  const names = namesOf([sense])
  return names.slice(0, 2).join('، ') + (names.length > 2 ? '…' : '')
}
