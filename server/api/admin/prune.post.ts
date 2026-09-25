import { and, eq, inArray } from 'drizzle-orm'
import * as v from 'valibot'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { normalizeArabic } from '../../../shared/utils/arabic'

/**
 * Retires words by headword (admin, or the IMPORT_TOKEN bearer that the importer
 * accepts). Made for the reverse of an import: a seed batch that turned out not
 * to earn its place — a word whose form is the same in every dialect teaches
 * nobody anything, see scripts/check-variety.ts.
 *
 * Soft delete only: the word, its links and the entries that exist only for it
 * are marked `deleted`, so nothing leaves the database and re-importing the file
 * brings the word back. An entry linked to another word is left alone. Every
 * removal is written to the revision history and the moderation log.
 *
 * `dryRun` (the default) reports what would go without touching anything.
 */
const Body = v.object({
  headwords: v.pipe(v.array(v.string()), v.minLength(1, 'القائمة فارغة'), v.maxLength(500, '500 كلمة كحد أقصى')),
  dryRun: v.optional(v.boolean(), true),
  reason: v.optional(v.string(), 'كلمة لا تختلف بين اللهجات'),
})

export default defineEventHandler(async (event) => {
  const admin = await requireImporter(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const report = { wordsRemoved: 0, entriesRemoved: 0, entriesKept: 0, notFound: [] as string[] }
  const authorId = admin?.id ?? await systemUserId(db)

  for (const headword of body.headwords) {
    const normalized = normalizeArabic(headword)
    // A retired word keeps its row, so the same headword can exist twice: match
    // the live one, or a deleted twin hides a word that is still on the site.
    const word = await db.query.words.findFirst({
      where: and(eq(schema.words.headwordNormalized, normalized), eq(schema.words.status, 'active')),
      with: { links: { with: { entry: { with: { links: true } } } } },
    })
    if (!word) { report.notFound.push(headword); continue }
    const links = word.links.filter(l => l.status === 'active' && l.entry.status === 'active')
    // An entry that also answers to another word stays: only this page goes.
    const orphans = links.filter(l => !l.entry.links.some(o => o.status === 'active' && o.wordId !== word.id))
    report.wordsRemoved++
    report.entriesRemoved += orphans.length
    report.entriesKept += links.length - orphans.length
    if (body.dryRun) continue

    await db.transaction(async (tx) => {
      const now = new Date()
      await tx.update(schema.words).set({ status: 'deleted', updatedAt: now }).where(eq(schema.words.id, word.id))
      await tx.update(schema.wordEntryLinks).set({ status: 'deleted', updatedAt: now }).where(eq(schema.wordEntryLinks.wordId, word.id))
      if (orphans.length) {
        await tx.update(schema.entries).set({ status: 'deleted', updatedAt: now })
          .where(inArray(schema.entries.id, orphans.map(l => l.entry.id)))
      }
      await recordRevision(tx, 'word', word.id, { status: 'deleted' }, authorId, body.reason)
    })
  }

  if (!body.dryRun) {
    await db.transaction(tx => logModeration(tx, authorId, 'prune', 'word', 0,
      `${report.wordsRemoved} كلمة، ${report.entriesRemoved} مدخل — ${body.reason}`))
  }
  return report
})
