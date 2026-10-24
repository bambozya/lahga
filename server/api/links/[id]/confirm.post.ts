import { useDb } from '../../../db'
import { idParam } from '../../../utils/validate'

/**
 * An admin or moderator vouches for a draft (schema.wordEntryLinks.needsReview):
 * «yes, this form says this word in this dialect». The other way off the review
 * list is two net upvotes (server/utils/votes.ts). Recorded in the revisions
 * and the moderation log like every other editorial act.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.role !== 'admin' && user.role !== 'moderator') throw createError({ statusCode: 403, statusMessage: 'التأكيد للمشرفين فقط' })
  const id = idParam(event, 'العنصر غير موجود')
  const db = await useDb()
  return db.transaction(async (tx) => {
    if (!await confirmDraft(tx, id, user.id, 'تأكيد')) throw createError({ statusCode: 400, statusMessage: 'ليس بحاجة إلى تحقق' })
    return { ok: true }
  })
})
