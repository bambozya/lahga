import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields, normalizeArabic } from '../../utils/contribute'

/** Adds how a dialect says an existing word: a new entry linked to that word. */
const Body = v.object({
  wordId: fields.id,
  dialect: fields.dialect,
  form: fields.form,
  meaning: fields.meaning,
  notes: fields.notes,
  example: v.optional(v.object({ text: fields.text, gloss: fields.gloss })),
})

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const word = await db.query.words.findFirst({ where: and(eq(schema.words.id, body.wordId), eq(schema.words.status, 'active')) })
  if (!word) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  const dialect = await findDialect(db, body.dialect)

  const formNormalized = normalizeArabic(body.form)
  const duplicate = await db.select({ id: schema.entries.id }).from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      eq(schema.wordEntryLinks.wordId, word.id), eq(schema.wordEntryLinks.status, 'active'),
      eq(schema.entries.dialectId, dialect.id), eq(schema.entries.formNormalized, formNormalized), eq(schema.entries.status, 'active'),
    )).limit(1)
  if (duplicate.length) throw createError({ statusCode: 409, statusMessage: 'هذا الشكل مضاف بالفعل لهذه اللهجة' })

  const id = await db.transaction(async (tx) => {
    const [entry] = await tx.insert(schema.entries).values({
      dialectId: dialect.id, form: body.form, formNormalized, meaning: body.meaning, notes: body.notes || null, createdBy: user.id,
    }).returning()
    await recordRevision(tx, 'entry', entry!.id, { dialect: dialect.slug, form: entry!.form, meaning: entry!.meaning, notes: entry!.notes }, user.id)
    const [link] = await tx.insert(schema.wordEntryLinks).values({ wordId: word.id, entryId: entry!.id, createdBy: user.id }).returning()
    await recordRevision(tx, 'link', link!.id, { wordId: word.id, entryId: entry!.id }, user.id)
    if (body.example) {
      const [ex] = await tx.insert(schema.examples).values({ entryId: entry!.id, text: body.example.text, gloss: body.example.gloss || null, createdBy: user.id }).returning()
      await recordRevision(tx, 'example', ex!.id, { text: ex!.text, gloss: ex!.gloss }, user.id)
    }
    return entry!.id
  })
  return { id }
})
