import * as v from 'valibot'
import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { readBody$ } from '../../../utils/validate'

/**
 * Resolves a flag. "dismissed" leaves the content alone; "hidden" and "deleted"
 * change the content's status. Every other open flag on the same item is
 * resolved the same way, so the queue never shows the same problem twice.
 */
const Body = v.object({
  resolution: v.picklist(['dismissed', 'hidden', 'deleted'], 'قرار غير معروف'),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  const db = await useDb()
  const flag = await db.query.flags.findFirst({ where: eq(schema.flags.id, id) })
  if (!flag) throw createError({ statusCode: 404, statusMessage: 'البلاغ غير موجود' })
  if (flag.resolvedAt) throw createError({ statusCode: 409, statusMessage: 'هذا البلاغ محسوم بالفعل' })

  await db.transaction(async (tx) => {
    if (body.resolution !== 'dismissed') {
      await setContentStatus(tx, admin.id, flag.targetType, flag.targetId, body.resolution, body.note || `بلاغ #${id}: ${flag.reason}`)
    }
    await tx.update(schema.flags).set({ resolvedAt: new Date(), resolvedBy: admin.id, resolution: body.resolution })
      .where(and(eq(schema.flags.targetType, flag.targetType), eq(schema.flags.targetId, flag.targetId), isNull(schema.flags.resolvedAt)))
    await logModeration(tx, admin.id, 'resolve_flag', 'flag', id, `${body.resolution}${body.note ? ': ' + body.note : ''}`)
  })
  return { ok: true }
})
