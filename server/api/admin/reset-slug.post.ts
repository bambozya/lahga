import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { slugify } from '../../../shared/utils/arabic'

/**
 * Rebuilds a word's slug from its current headword (admin only). A slug is
 * set once at creation and never touched by an edit, so a link already
 * shared keeps working; the price is that a headword renamed since — «أحبك»
 * that became «فديتك بروحى» — still answers at its old address. This is the
 * deliberate exception: the page moves to slugify(headword), with -2, -3 …
 * on collision as at creation, and the old address stops working. Recorded
 * in the revision history and the moderation log.
 */
const Body = v.object({ wordId: v.pipe(v.number(), v.integer(), v.minValue(1)) })

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const { wordId } = await readBody$(event, Body)
  const db = await useDb()
  const word = await db.query.words.findFirst({ where: eq(schema.words.id, wordId) })
  if (!word) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  if (word.status !== 'active') throw createError({ statusCode: 400, statusMessage: 'الكلمة ليست ظاهرة' })

  return db.transaction(async (tx) => {
    // Like uniqueSlug (server/utils/slug.ts), except that the word's own row
    // is not a collision: a word already at /w/كتاب-2 whose plain form is
    // taken keeps -2 rather than moving on to -3.
    const base = slugify(word.headword) || 'كلمة'
    let slug = base
    for (let n = 2; n < 1000; n++) {
      const clash = await tx.query.words.findFirst({ where: eq(schema.words.slug, slug), columns: { id: true } })
      if (!clash || clash.id === word.id) break
      slug = `${base}-${n}`
    }
    if (slug === word.slug) throw createError({ statusCode: 400, statusMessage: 'العنوان مطابق للكلمة أصلاً' })
    await tx.update(schema.words).set({ slug, updatedAt: new Date() }).where(eq(schema.words.id, word.id))
    const reason = `إعادة ضبط العنوان من /w/${word.slug} إلى /w/${slug}`
    await recordRevision(tx, 'word', word.id, { slug }, admin.id, reason)
    await logModeration(tx, admin.id, 'reset-slug', 'word', word.id, reason)
    return { from: word.slug, to: slug }
  })
})
