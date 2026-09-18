import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { readBody$ } from '../../../utils/validate'

/** Approves or rejects a proposal. Approval applies the change. */
const Body = v.object({
  status: v.picklist(['approved', 'rejected'], 'قرار غير معروف'),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  const db = await useDb()
  const p = await db.query.proposals.findFirst({ where: eq(schema.proposals.id, id) })
  if (!p) throw createError({ statusCode: 404, statusMessage: 'الاقتراح غير موجود' })
  if (p.status !== 'pending') throw createError({ statusCode: 409, statusMessage: 'هذا الاقتراح محسوم بالفعل' })
  const d = p.data as Record<string, any>

  await db.transaction(async (tx) => {
    if (body.status === 'approved') {
      if (p.kind === 'dialect_description') {
        await tx.update(schema.dialects).set({ descriptionAr: String(d.descriptionAr) }).where(eq(schema.dialects.id, p.targetId!))
      } else if (p.kind === 'new_dialect') {
        const parent = d.parentSlug ? await tx.query.dialects.findFirst({ where: eq(schema.dialects.slug, String(d.parentSlug)) }) : null
        await tx.insert(schema.dialects).values({ slug: String(d.slug), nameAr: String(d.nameAr), descriptionAr: d.descriptionAr ? String(d.descriptionAr) : null, parentId: parent?.id ?? null, sortOrder: 999 })
      }
    }
    await tx.update(schema.proposals).set({ status: body.status, decidedBy: admin.id, decidedAt: new Date(), note: body.note || null }).where(eq(schema.proposals.id, id))
    await logModeration(tx, admin.id, body.status === 'approved' ? 'approve' : 'reject', 'proposal', id, body.note)
  })
  return { ok: true }
})
