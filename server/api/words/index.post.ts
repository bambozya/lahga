import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields, normalizeArabic } from '../../utils/contribute'

/**
 * Adds a word together with its first dialect entry (and an optional example) in one
 * transaction, so the site never shows a word without a dialect.
 */
const Body = v.object({
  headword: fields.headword,
  definition: fields.definition,
  kind: fields.kind,
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

  const headwordNormalized = normalizeArabic(body.headword)
  const existing = await db.query.words.findFirst({
    where: and(eq(schema.words.headwordNormalized, headwordNormalized), eq(schema.words.status, 'active')),
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'هذه الكلمة موجودة بالفعل؛ أضف شكلها في لهجتك إلى صفحتها',
      data: { wordId: existing.id },
    })
  }

  const dialect = await findDialect(db, body.dialect)
  const id = await db.transaction(async (tx) => {
    const [word] = await tx.insert(schema.words).values({
      headword: body.headword, headwordNormalized, definition: body.definition || null, kind: body.kind, createdBy: user.id,
    }).returning()
    await recordRevision(tx, 'word', word!.id, { headword: word!.headword, definition: word!.definition, kind: word!.kind }, user.id)

    const [entry] = await tx.insert(schema.entries).values({
      dialectId: dialect.id, form: body.form, formNormalized: normalizeArabic(body.form),
      meaning: body.meaning || null, notes: body.notes || null, createdBy: user.id,
    }).returning()
    await recordRevision(tx, 'entry', entry!.id, { dialect: dialect.slug, form: entry!.form, meaning: entry!.meaning, notes: entry!.notes }, user.id)

    const [link] = await tx.insert(schema.wordEntryLinks).values({ wordId: word!.id, entryId: entry!.id, createdBy: user.id }).returning()
    await recordRevision(tx, 'link', link!.id, { wordId: word!.id, entryId: entry!.id }, user.id)

    if (body.example) {
      const [ex] = await tx.insert(schema.examples).values({
        entryId: entry!.id, text: body.example.text, gloss: body.example.gloss || null, createdBy: user.id,
      }).returning()
      await recordRevision(tx, 'example', ex!.id, { text: ex!.text, gloss: ex!.gloss }, user.id)
    }
    return word!.id
  })
  return { id }
})
