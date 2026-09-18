import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields, normalizeArabic } from '../../utils/contribute'

/**
 * Bulk import of seed content (admin only). The body is a list of words, each
 * with its dialect entries and examples; see docs/seed/FORMAT.md. Each word is
 * validated on its own, so one bad item does not stop the rest. A headword
 * that already exists gets the new entries merged in; an entry that already
 * exists for that word and dialect is skipped. Everything is attributed to the
 * system account «لهجة» unless `authorId` is given. `dryRun` validates only.
 */
const Example = v.object({ text: fields.text, gloss: fields.gloss })
const Entry = v.object({ dialect: fields.dialect, form: fields.form, meaning: fields.meaning, notes: fields.notes, examples: v.optional(v.array(Example), []) })
const Word = v.object({ headword: fields.headword, definition: fields.definition, kind: fields.kind, entries: v.pipe(v.array(Entry), v.minLength(1, 'كل كلمة تحتاج إلى مدخل واحد على الأقل')) })
const Body = v.object({ words: v.pipe(v.array(v.unknown()), v.minLength(1, 'القائمة فارغة'), v.maxLength(500, '500 كلمة كحد أقصى في المرة الواحدة')), dryRun: v.optional(v.boolean(), false), authorId: v.optional(v.number()) })

const SYSTEM_EMAIL = 'system@lahga.invalid'

async function systemUserId(db: Awaited<ReturnType<typeof useDb>>) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, SYSTEM_EMAIL) })
  if (existing) return existing.id
  const [u] = await db.insert(schema.users).values({ email: SYSTEM_EMAIL, displayName: 'لهجة', emailVerifiedAt: new Date(), bio: 'حساب الموقع: المحتوى الأول الذي بدأ به القاموس.' }).returning()
  return u!.id
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const report = { wordsCreated: 0, wordsMerged: 0, entriesCreated: 0, entriesSkipped: 0, examplesCreated: 0, errors: [] as { index: number, headword?: string, message: string }[] }
  const dialects = await db.query.dialects.findMany({ where: eq(schema.dialects.active, 1) })
  const bySlug = new Map(dialects.map(d => [d.slug, d]))
  const authorId = body.dryRun ? 0 : (body.authorId ?? await systemUserId(db))

  for (const [index, raw] of body.words.entries()) {
    const parsed = v.safeParse(Word, raw)
    if (!parsed.success) {
      report.errors.push({ index, headword: (raw as any)?.headword, message: parsed.issues[0]?.message || 'بيانات غير صالحة' })
      continue
    }
    const w = parsed.output
    const unknown = w.entries.find(e => !bySlug.has(e.dialect))
    if (unknown) { report.errors.push({ index, headword: w.headword, message: `لهجة غير معروفة: ${unknown.dialect}` }); continue }
    if (body.dryRun) { report.wordsCreated++; report.entriesCreated += w.entries.length; report.examplesCreated += w.entries.reduce((n, e) => n + e.examples.length, 0); continue }

    await db.transaction(async (tx) => {
      const headwordNormalized = normalizeArabic(w.headword)
      let word = await tx.query.words.findFirst({ where: and(eq(schema.words.headwordNormalized, headwordNormalized), eq(schema.words.status, 'active')), with: { links: { with: { entry: true } } } })
      if (word) {
        report.wordsMerged++
      } else {
        const [created] = await tx.insert(schema.words).values({ headword: w.headword, headwordNormalized, definition: w.definition, kind: w.kind, createdBy: authorId }).returning()
        await recordRevision(tx, 'word', created!.id, { headword: created!.headword, definition: created!.definition, kind: created!.kind }, authorId, 'استيراد')
        word = { ...created!, links: [] }
        report.wordsCreated++
      }
      for (const e of w.entries) {
        const dialect = bySlug.get(e.dialect)!
        const formNormalized = normalizeArabic(e.form)
        const dup = word.links.some(l => l.status === 'active' && l.entry.status === 'active' && l.entry.dialectId === dialect.id && l.entry.formNormalized === formNormalized)
        if (dup) { report.entriesSkipped++; continue }
        const [entry] = await tx.insert(schema.entries).values({ dialectId: dialect.id, form: e.form, formNormalized, meaning: e.meaning, notes: e.notes || null, createdBy: authorId }).returning()
        await recordRevision(tx, 'entry', entry!.id, { dialect: dialect.slug, form: entry!.form, meaning: entry!.meaning, notes: entry!.notes }, authorId, 'استيراد')
        const [link] = await tx.insert(schema.wordEntryLinks).values({ wordId: word.id, entryId: entry!.id, createdBy: authorId }).returning()
        await recordRevision(tx, 'link', link!.id, { wordId: word.id, entryId: entry!.id }, authorId, 'استيراد')
        report.entriesCreated++
        for (const x of e.examples) {
          const [ex] = await tx.insert(schema.examples).values({ entryId: entry!.id, text: x.text, gloss: x.gloss || null, createdBy: authorId }).returning()
          await recordRevision(tx, 'example', ex!.id, { text: ex!.text, gloss: ex!.gloss }, authorId, 'استيراد')
          report.examplesCreated++
        }
      }
    })
  }
  if (!body.dryRun) await db.transaction(tx => logModeration(tx, admin.id, 'import', 'import', 0, `${report.wordsCreated} كلمة جديدة، ${report.wordsMerged} مدمجة، ${report.entriesCreated} مدخل`))
  return report
})
