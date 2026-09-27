/**
 * The dialect forms of a word, one line per distinct form, with every dialect
 * that says it: «الحين» خليجي، نجدي. Thirty entries are rarely thirty answers,
 * and repeating a form once per dialect hides that.
 *
 * The first entry that says it carries the line, so a list of forms doubles as
 * a table of contents for the detail below it.
 */
export function formsOf(entries: { id: number, form: string, dialect: { nameAr: string }, needsReview?: boolean }[]) {
  const byForm = new Map<string, { form: string, entryId: number, dialects: string[], draft: boolean }>()
  for (const e of entries) {
    const seen = byForm.get(e.form) ?? byForm.set(e.form, { form: e.form, entryId: e.id, dialects: [], draft: true }).get(e.form)!
    if (!seen.dialects.includes(e.dialect.nameAr)) seen.dialects.push(e.dialect.nameAr)
    // A line is a draft only while every dialect behind it is: one checked
    // speaker of the form is enough to write it plainly.
    if (!e.needsReview) seen.draft = false
  }
  return [...byForm.values()]
}
