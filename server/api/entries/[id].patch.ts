import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'
import { normalizeArabic } from '../../../shared/utils/arabic'

const Body = v.object({
  dialect: v.optional(fields.dialect),
  form: v.optional(fields.form),
  meaning: v.optional(fields.meaning),
  notes: fields.notes,
  reason: fields.reason,
})

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  const db = await useDb()
  const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, id) })
  if (!entry || entry.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'المدخل غير موجود' })
  assertOwner(entry, user)
  const dialect = body.dialect ? await findDialect(db, body.dialect) : null

  await db.transaction(async (tx) => {
    const [updated] = await tx.update(schema.entries).set({
      ...(dialect && { dialectId: dialect.id }),
      ...(body.form !== undefined && { form: body.form, formNormalized: normalizeArabic(body.form) }),
      ...(body.meaning !== undefined && { meaning: body.meaning || null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      updatedAt: new Date(),
    }).where(eq(schema.entries.id, id)).returning()
    const slug = dialect?.slug ?? (await tx.query.dialects.findFirst({ where: eq(schema.dialects.id, updated!.dialectId) }))?.slug
    await recordRevision(tx, 'entry', id, { dialect: slug, form: updated!.form, meaning: updated!.meaning, notes: updated!.notes }, user.id, body.reason)
  })
  return { ok: true }
})
