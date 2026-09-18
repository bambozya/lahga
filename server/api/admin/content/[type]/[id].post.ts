import * as v from 'valibot'
import { useDb } from '../../../../db'
import { readBody$ } from '../../../../utils/validate'

/** Hide, restore or delete any content row. */
const Body = v.object({
  status: v.picklist(['active', 'hidden', 'deleted'], 'حالة غير معروفة'),
  reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const type = getRouterParam(event, 'type') as string
  const id = Number(getRouterParam(event, 'id'))
  if (!(type in contentTables) || !Number.isInteger(id)) throw createError({ statusCode: 404, statusMessage: 'العنصر غير موجود' })
  const body = await readBody$(event, Body)
  const db = await useDb()
  await db.transaction(tx => setContentStatus(tx, admin.id, type as ContentType, id, body.status, body.reason))
  return { ok: true }
})
