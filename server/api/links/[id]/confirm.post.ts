import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * An admin or moderator vouches for a draft (schema.wordEntryLinks.needsReview):
 * «yes, this form says this word in this dialect». The other way off the review
 * list is two net upvotes (server/utils/votes.ts). Recorded in the revisions
 * and the moderation log like every other editorial act.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.role !== 'admin' && user.role !== 'moderator') throw createError({ statusCode: 403, statusMessage: 'التأكيد للمشرفين فقط' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'رقم غير صالح' })
  const db = await useDb()
  return db.transaction(async (tx) => {
    const [link] = await tx.update(schema.wordEntryLinks).set({ needsReview: false, updatedAt: new Date() })
      .where(and(eq(schema.wordEntryLinks.id, id), eq(schema.wordEntryLinks.needsReview, true), eq(schema.wordEntryLinks.status, 'active')))
      .returning({ id: schema.wordEntryLinks.id })
    if (!link) throw createError({ statusCode: 400, statusMessage: 'ليس بحاجة إلى تحقق' })
    await recordRevision(tx, 'link', id, { needsReview: false }, user.id, 'تأكيد')
    await logModeration(tx, user.id, 'confirm', 'link', id)
    return { ok: true }
  })
})
