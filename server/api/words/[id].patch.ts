import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields, normalizeArabic } from '../../utils/contribute'

const Body = v.object({
  headword: v.optional(fields.headword),
  definition: v.optional(fields.definition),
  kind: v.optional(fields.kind),
  reason: fields.reason,
})

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, Body)
  const db = await useDb()
  const word = await db.query.words.findFirst({ where: eq(schema.words.id, id) })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  assertOwner(word, user)

  await db.transaction(async (tx) => {
    const [updated] = await tx.update(schema.words).set({
      ...(body.headword !== undefined && { headword: body.headword, headwordNormalized: normalizeArabic(body.headword) }),
      ...(body.definition !== undefined && { definition: body.definition || null }),
      ...(body.kind !== undefined && { kind: body.kind }),
      updatedAt: new Date(),
    }).where(eq(schema.words.id, id)).returning()
    await recordRevision(tx, 'word', id, { headword: updated!.headword, definition: updated!.definition, kind: updated!.kind }, user.id, body.reason)
  })
  return { ok: true }
})
