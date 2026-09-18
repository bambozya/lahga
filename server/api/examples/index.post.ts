import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields } from '../../utils/contribute'

/** Adds an example sentence to any active entry, one's own or someone else's. */
export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const body = await readBody$(event, v.object({ entryId: fields.id, text: fields.text, gloss: fields.gloss }))
  const db = await useDb()
  const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, body.entryId) })
  if (!entry || entry.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'المدخل غير موجود' })

  const id = await db.transaction(async (tx) => {
    const [ex] = await tx.insert(schema.examples).values({ entryId: entry.id, text: body.text, gloss: body.gloss || null, createdBy: user.id }).returning()
    await recordRevision(tx, 'example', ex!.id, { text: ex!.text, gloss: ex!.gloss }, user.id)
    return ex!.id
  })
  return { id }
})
