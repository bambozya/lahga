import { and, eq } from 'drizzle-orm'
import * as v from 'valibot'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { normalizeArabic } from '../../utils/contribute'

/**
 * Retires single dialect forms from a word (admin, or the IMPORT_TOKEN bearer
 * that the importer accepts). Where `prune` takes a whole word off the site,
 * this takes one line off a page: made for an imported source that gave one
 * dialect far more forms than a comparison can carry
 * (scripts/retire-extra-forms.ts).
 *
 * Soft delete only. The link between the word and the entry is marked
 * `deleted`; the entry itself only when no other word still uses it. Every
 * removal is written to the revision history and the moderation log.
 *
 * `dryRun` (the default) reports what would go without touching anything.
 */
const Line = v.object({
  headword: v.pipe(v.string(), v.minLength(1)),
  dialect: v.pipe(v.string(), v.minLength(1)),
  form: v.pipe(v.string(), v.minLength(1)),
})
const Body = v.object({
  entries: v.pipe(v.array(Line), v.minLength(1, 'القائمة فارغة'), v.maxLength(1000, '1000 مدخل كحد أقصى')),
  dryRun: v.optional(v.boolean(), true),
  reason: v.optional(v.string(), 'صيغ زائدة من مصدر مستورد'),
})

export default defineEventHandler(async (event) => {
  const admin = await requireImporter(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const report = { retired: 0, unlinkedOnly: 0, notFound: [] as string[] }
  const authorId = admin?.id ?? await systemUserId(db)

  for (const line of body.entries) {
    const word = await db.query.words.findFirst({
      where: and(eq(schema.words.headwordNormalized, normalizeArabic(line.headword)), eq(schema.words.status, 'active')),
      with: { links: { with: { entry: { with: { dialect: true, links: true } } } } },
    })
    const wanted = normalizeArabic(line.form)
    const link = word?.links.find(l => l.status === 'active' && l.entry.status === 'active'
      && l.entry.dialect.slug === line.dialect && normalizeArabic(l.entry.form) === wanted)
    if (!word || !link) { report.notFound.push(`${line.headword} / ${line.dialect} / ${line.form}`); continue }

    // An entry that also answers to another word keeps its row; only this page loses the line.
    const usedElsewhere = link.entry.links.some(o => o.status === 'active' && o.wordId !== word.id)
    if (usedElsewhere) report.unlinkedOnly++; else report.retired++
    if (body.dryRun) continue

    await db.transaction(async (tx) => {
      const now = new Date()
      await tx.update(schema.wordEntryLinks).set({ status: 'deleted', updatedAt: now }).where(eq(schema.wordEntryLinks.id, link.id))
      if (!usedElsewhere) {
        await tx.update(schema.entries).set({ status: 'deleted', updatedAt: now }).where(eq(schema.entries.id, link.entry.id))
        await recordRevision(tx, 'entry', link.entry.id, { status: 'deleted' }, authorId, body.reason)
      }
    })
  }

  if (!body.dryRun) {
    await db.transaction(tx => logModeration(tx, authorId, 'retire-entries', 'entry', 0,
      `${report.retired + report.unlinkedOnly} مدخل — ${body.reason}`))
  }
  return report
})
