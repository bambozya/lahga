import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { normalizeArabic } from '../../../../../shared/utils/arabic'

/**
 * Puts the content of an older revision back as a new revision (the history
 * itself is never rewritten). Works for words, entries and examples.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const rev = await db.query.revisions.findFirst({ where: eq(schema.revisions.id, id) })
  if (!rev) throw createError({ statusCode: 404, statusMessage: 'الإصدار غير موجود' })
  const d = rev.data as Record<string, any>
  if (d.status === 'deleted') throw createError({ statusCode: 400, statusMessage: 'هذا إصدار حذف؛ استخدم الاسترجاع على الإصدار الذي يحمل المحتوى' })
  const reason = `استرجاع الإصدار ${rev.revisionNo}`

  await db.transaction(async (tx) => {
    switch (rev.targetType) {
      case 'word': {
        const [w] = await tx.update(schema.words).set({
          headword: d.headword, headwordNormalized: normalizeArabic(d.headword), definition: d.definition, kind: d.kind ?? 'word', status: 'active', updatedAt: new Date(),
        }).where(eq(schema.words.id, rev.targetId)).returning()
        if (!w) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
        await recordRevision(tx, 'word', w.id, { headword: w.headword, definition: w.definition, kind: w.kind }, admin.id, reason)
        break
      }
      case 'entry': {
        const dialect = d.dialect ? await tx.query.dialects.findFirst({ where: and(eq(schema.dialects.slug, d.dialect)) }) : null
        const [e] = await tx.update(schema.entries).set({
          ...(dialect && { dialectId: dialect.id }), form: d.form, formNormalized: normalizeArabic(d.form), meaning: d.meaning, notes: d.notes ?? null, status: 'active', updatedAt: new Date(),
        }).where(eq(schema.entries.id, rev.targetId)).returning()
        if (!e) throw createError({ statusCode: 404, statusMessage: 'المدخل غير موجود' })
        await recordRevision(tx, 'entry', e.id, { dialect: d.dialect, form: e.form, meaning: e.meaning, notes: e.notes }, admin.id, reason)
        break
      }
      case 'example': {
        const [x] = await tx.update(schema.examples).set({ text: d.text, gloss: d.gloss ?? null, status: 'active', updatedAt: new Date() })
          .where(eq(schema.examples.id, rev.targetId)).returning()
        if (!x) throw createError({ statusCode: 404, statusMessage: 'المثال غير موجود' })
        await recordRevision(tx, 'example', x.id, { text: x.text, gloss: x.gloss }, admin.id, reason)
        break
      }
      default:
        throw createError({ statusCode: 400, statusMessage: 'لا يمكن استرجاع هذا النوع' })
    }
    await logModeration(tx, admin.id, 'revert', rev.targetType, rev.targetId, reason)
  })
  return { ok: true }
})
