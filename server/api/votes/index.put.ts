import * as v from 'valibot'
import { useDb } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'

/** Sets the caller's vote on one item: 1 (up), -1 (down) or 0 (remove). Idempotent. */
const Body = v.object({
  targetType: v.picklist(['word', 'entry', 'link', 'example'], 'نوع غير معروف'),
  targetId: fields.id,
  value: v.picklist([1, -1, 0], 'قيمة التصويت غير صالحة'),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.emailVerifiedAt) throw createError({ statusCode: 403, statusMessage: 'أكّد بريدك الإلكتروني أولاً لتتمكن من التصويت' })
  assertRateLimit(`vote:${user.id}`, 120, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const target = await findTarget(db, body.targetType, body.targetId)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'العنصر غير موجود' })
  if (target.createdBy === user.id) throw createError({ statusCode: 400, statusMessage: 'لا يمكنك التصويت على ما أضفته أنت' })
  return db.transaction(tx => applyVote(tx, user.id, body.targetType, body.targetId, body.value))
})
