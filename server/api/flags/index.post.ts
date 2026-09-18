import * as v from 'valibot'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'
import { isArabicOnly } from '../../../shared/utils/arabic'

/** Reports an item for the moderation queue. One open flag per user per item. */
const Body = v.object({
  targetType: v.picklist(['word', 'entry', 'link', 'example'], 'نوع غير معروف'),
  targetId: fields.id,
  reason: v.picklist(['offensive', 'wrong_dialect', 'wrong_link', 'spam', 'other'], 'سبب غير معروف'),
  comment: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500, 'التعليق طويل جداً'), v.check(isArabicOnly, 'التعليق يجب أن يكون بالحروف العربية'))),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.emailVerifiedAt) throw createError({ statusCode: 403, statusMessage: 'أكّد بريدك الإلكتروني أولاً' })
  assertRateLimit(`flag:${user.id}`, 20, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  const db = await useDb()
  if (!await findTarget(db, body.targetType, body.targetId)) throw createError({ statusCode: 404, statusMessage: 'العنصر غير موجود' })
  const open = await db.query.flags.findFirst({ where: and(
    eq(schema.flags.userId, user.id), eq(schema.flags.targetType, body.targetType), eq(schema.flags.targetId, body.targetId), isNull(schema.flags.resolvedAt),
  ) })
  if (open) throw createError({ statusCode: 409, statusMessage: 'أبلغت عن هذا العنصر من قبل، وسينظر فيه المشرفون' })
  await db.insert(schema.flags).values({ targetType: body.targetType, targetId: body.targetId, reason: body.reason, comment: body.comment || null, userId: user.id })
  return { ok: true }
})
