import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody$(event, v.object({ text: v.optional(fields.text), gloss: fields.gloss, reason: fields.reason }))
  const db = await useDb()
  const ex = await db.query.examples.findFirst({ where: eq(schema.examples.id, id) })
  if (!ex || ex.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'المثال غير موجود' })
  assertOwner(ex, user)
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(schema.examples).set({
      ...(body.text !== undefined && { text: body.text }),
      ...(body.gloss !== undefined && { gloss: body.gloss || null }),
      updatedAt: new Date(),
    }).where(eq(schema.examples.id, id)).returning()
    await recordRevision(tx, 'example', id, { text: updated!.text, gloss: updated!.gloss }, user.id, body.reason)
  })
  return { ok: true }
})
