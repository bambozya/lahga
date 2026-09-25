import { and, eq } from 'drizzle-orm'
import * as v from 'valibot'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'

/**
 * Folds one word into another (admin only). Made for the pairs that
 * /api/admin/slug-suffixes lists — a live «أين» at /w/أين-2 beside a retired
 * «أين» that still holds /w/أين — but it works for any two rows.
 *
 * What happens, in one transaction:
 * - every link of the absorbed word moves to the kept word, unless the kept
 *   word already has that entry or an active entry with the same dialect and
 *   form; a moved link, and its entry, come back to `active` if they had been
 *   retired, so a pruned twin's forms and examples return to the page;
 * - the kept word takes the absorbed word's definition if it has none;
 * - if the absorbed word holds the plain slug the kept word's numbered slug
 *   was built on, the two swap, so the page moves to the clean address and
 *   the old numbered one now belongs to the retired row (and 404s);
 * - the absorbed word is marked `deleted`.
 * Every change is written to the revision history and the moderation log.
 * Soft delete only, nothing leaves the database. `dryRun` reports instead.
 */
const Body = v.object({
  keepId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  absorbId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  dryRun: v.optional(v.boolean(), false),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody$(event, Body)
  if (body.keepId === body.absorbId) throw createError({ statusCode: 400, statusMessage: 'الكلمتان واحدة' })
  const db = await useDb()

  const withLinks = { links: { with: { entry: { columns: { id: true, dialectId: true, formNormalized: true, status: true } } } } } as const
  const keep = await db.query.words.findFirst({ where: eq(schema.words.id, body.keepId), with: withLinks })
  const absorb = await db.query.words.findFirst({ where: eq(schema.words.id, body.absorbId), with: withLinks })
  if (!keep || !absorb) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  if (keep.status !== 'active') throw createError({ statusCode: 400, statusMessage: 'الكلمة التي تُبقى يجب أن تكون ظاهرة' })

  const keptEntryIds = new Set(keep.links.map(l => l.entryId))
  const keptForms = new Set(keep.links.filter(l => l.status === 'active' && l.entry.status === 'active').map(l => `${l.entry.dialectId}|${l.entry.formNormalized}`))
  const moved = absorb.links.filter(l => !keptEntryIds.has(l.entryId) && !keptForms.has(`${l.entry.dialectId}|${l.entry.formNormalized}`))
  const revived = moved.filter(l => l.status !== 'active' || l.entry.status !== 'active')
  const base = keep.slug?.replace(/-\d+$/, '')
  const swapSlugs = !!base && base !== keep.slug && absorb.slug === base
  const report = {
    moved: moved.length, revived: revived.length, skipped: absorb.links.length - moved.length,
    definitionCopied: !keep.definition && !!absorb.definition,
    slug: swapSlugs ? base : keep.slug,
  }
  if (body.dryRun) return report

  const reason = `دمج «${absorb.headword}» في «${keep.headword}»`
  await db.transaction(async (tx) => {
    const now = new Date()
    for (const l of moved) {
      await tx.update(schema.wordEntryLinks).set({ wordId: keep.id, status: 'active', updatedAt: now }).where(eq(schema.wordEntryLinks.id, l.id))
      await recordRevision(tx, 'link', l.id, { wordId: keep.id, status: 'active' }, admin.id, reason)
      if (l.entry.status !== 'active') {
        await tx.update(schema.entries).set({ status: 'active', updatedAt: now }).where(eq(schema.entries.id, l.entryId))
        await recordRevision(tx, 'entry', l.entryId, { status: 'active' }, admin.id, reason)
      }
    }
    // The links that stay behind go with their word.
    await tx.update(schema.wordEntryLinks).set({ status: 'deleted', updatedAt: now })
      .where(and(eq(schema.wordEntryLinks.wordId, absorb.id), eq(schema.wordEntryLinks.status, 'active')))

    const keepPatch: Partial<typeof schema.words.$inferInsert> = { updatedAt: now }
    if (report.definitionCopied) keepPatch.definition = absorb.definition
    if (swapSlugs) {
      // The slug column is unique: park the absorbed row on no slug while the two trade places.
      await tx.update(schema.words).set({ slug: null, updatedAt: now }).where(eq(schema.words.id, absorb.id))
      keepPatch.slug = base
    }
    await tx.update(schema.words).set(keepPatch).where(eq(schema.words.id, keep.id))
    await tx.update(schema.words).set({ status: 'deleted', updatedAt: now, ...(swapSlugs ? { slug: keep.slug } : {}) }).where(eq(schema.words.id, absorb.id))

    await recordRevision(tx, 'word', keep.id, { slug: keepPatch.slug ?? keep.slug, definition: keepPatch.definition ?? keep.definition }, admin.id, reason)
    await recordRevision(tx, 'word', absorb.id, { status: 'deleted', slug: swapSlugs ? keep.slug : absorb.slug }, admin.id, reason)
    await logModeration(tx, admin.id, 'merge', 'word', keep.id, `${reason}: ${moved.length} مدخل نُقل، ${revived.length} أُعيد`)
  })
  return report
})
