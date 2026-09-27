import * as v from 'valibot'
import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'
import { normalizeArabic } from '../../../shared/utils/arabic'

/**
 * Tags forms already on the site as «needs checking»
 * (schema.wordEntryLinks.needsReview), for `npm run mark-review`. Each item
 * names a headword, a dialect and a form; the matching active link is marked,
 * and nothing is ever created — unlike re-running the import, which would
 * bring back a draft someone has since corrected or removed. Items that match
 * nothing are counted and listed, not errors. `dryRun` (the default) only counts.
 */
const Item = v.object({ headword: fields.headword, dialect: fields.dialect, form: fields.form })
const Body = v.object({
  items: v.pipe(v.array(Item), v.minLength(1, 'القائمة فارغة'), v.maxLength(2000, '2000 عنصر كحد أقصى في المرة الواحدة')),
  dryRun: v.optional(v.boolean(), true),
})

export default defineEventHandler(async (event) => {
  const admin = await requireImporter(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const dialects = await db.query.dialects.findMany()
  const dialectId = new Map(dialects.map(d => [d.slug, d.id]))
  const report = { marked: 0, alreadyMarked: 0, missing: [] as string[] }
  const ids: number[] = []

  for (const it of body.items) {
    const word = await db.query.words.findFirst({
      where: and(eq(schema.words.headwordNormalized, normalizeArabic(it.headword)), eq(schema.words.status, 'active')),
      columns: { id: true },
      with: { links: { columns: { id: true, status: true, needsReview: true }, with: { entry: { columns: { dialectId: true, formNormalized: true, status: true } } } } },
    })
    const want = normalizeArabic(it.form)
    const link = word?.links.find(l => l.status === 'active' && l.entry.status === 'active'
      && l.entry.dialectId === dialectId.get(it.dialect) && l.entry.formNormalized === want)
    if (!link) { report.missing.push(`${it.headword} · ${it.dialect} · ${it.form}`); continue }
    if (link.needsReview) { report.alreadyMarked++; continue }
    report.marked++
    ids.push(link.id)
  }

  if (!body.dryRun && ids.length) {
    const actor = admin?.id ?? await systemUserId(db)
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 500) {
        await tx.update(schema.wordEntryLinks).set({ needsReview: true }).where(inArray(schema.wordEntryLinks.id, ids.slice(i, i + 500)))
      }
      await logModeration(tx, actor, 'review-marks', 'link', 0, `${ids.length} شكلاً بحاجة إلى تحقق`)
    })
  }
  return report
})
