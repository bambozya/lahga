import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { fields, normalizeArabic } from '../../utils/contribute'

/**
 * Bulk import of seed content (admin only). The body is a list of words, each
 * with its dialect entries and examples; see docs/seed/FORMAT.md. Each word is
 * validated on its own, so one bad item does not stop the rest. A headword
 * that already exists gets the new entries merged in; a definition or meaning
 * that only repeats the word it hangs under is dropped on the way in (see
 * echoesWord); an entry that already
 * exists in the same dialect is merged, never skipped: the entry that is there keeps what it has
 * and gains what the file brings (examples, a meaning or notes it was missing).
 * A form that already exists in the same dialect under another headword is
 * linked to this word too, rather than stored twice. Everything is attributed to the
 * system account «لهجة» unless `authorId` is given. `dryRun` validates only.
 */
const Example = v.object({ text: fields.text, gloss: fields.gloss })
const Entry = v.object({ dialect: fields.dialect, form: fields.form, meaning: fields.meaning, notes: fields.notes, examples: v.optional(v.array(Example), []) })
const Word = v.object({ headword: fields.headword, definition: fields.definition, kind: fields.kind, entries: v.pipe(v.array(Entry), v.minLength(1, 'كل كلمة تحتاج إلى مدخل واحد على الأقل')) })
const Body = v.object({ words: v.pipe(v.array(v.unknown()), v.minLength(1, 'القائمة فارغة'), v.maxLength(500, '500 كلمة كحد أقصى في المرة الواحدة')), dryRun: v.optional(v.boolean(), false), authorId: v.optional(v.number()) })

export default defineEventHandler(async (event) => {
  const admin = await requireImporter(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const report = { wordsCreated: 0, wordsMerged: 0, entriesCreated: 0, entriesMerged: 0, entriesLinked: 0, entriesFilled: 0, examplesCreated: 0, examplesSkipped: 0, errors: [] as { index: number, headword?: string, message: string }[] }
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
      let word = await tx.query.words.findFirst({ where: and(eq(schema.words.headwordNormalized, headwordNormalized), eq(schema.words.status, 'active')), with: { links: { with: { entry: { with: { examples: true } } } } } })
      if (word) {
        report.wordsMerged++
      } else {
        const definition = echoesWord(w.definition, w.headword) ? null : (w.definition || null)
        const slug = await uniqueSlug(tx, w.headword)
        const [created] = await tx.insert(schema.words).values({ headword: w.headword, headwordNormalized, slug, definition, kind: w.kind, createdBy: authorId }).returning()
        await recordRevision(tx, 'word', created!.id, { headword: created!.headword, definition: created!.definition, kind: created!.kind }, authorId, 'استيراد')
        word = { ...created!, links: [] }
        report.wordsCreated++
      }
      /** Adds the examples a file brings, skipping any the entry already has. */
      const addExamples = async (entryId: number, list: { text: string, gloss?: string }[], existing: { text: string, status: string }[]) => {
        const seen = new Set(existing.filter(x => x.status === 'active').map(x => normalizeArabic(x.text)))
        for (const x of list) {
          if (seen.has(normalizeArabic(x.text))) { report.examplesSkipped++; continue }
          seen.add(normalizeArabic(x.text))
          const [ex] = await tx.insert(schema.examples).values({ entryId, text: x.text, gloss: x.gloss || null, createdBy: authorId }).returning()
          await recordRevision(tx, 'example', ex!.id, { text: ex!.text, gloss: ex!.gloss }, authorId, 'استيراد')
          report.examplesCreated++
        }
      }

      /** Fills the blanks on an entry that is already there. What it has, it keeps. */
      const fillGaps = async (entry: { id: number, meaning: string | null, notes: string | null, dialectId: number, form: string }, e: { meaning?: string, notes?: string }) => {
        const patch: { meaning?: string, notes?: string } = {}
        if (!entry.meaning && e.meaning && !echoesWord(e.meaning, entry.form, w.headword)) patch.meaning = e.meaning
        if (!entry.notes && e.notes) patch.notes = e.notes
        if (!Object.keys(patch).length) return
        await tx.update(schema.entries).set({ ...patch, updatedAt: new Date() }).where(eq(schema.entries.id, entry.id))
        Object.assign(entry, patch)
        const slug = dialects.find(d => d.id === entry.dialectId)?.slug
        await recordRevision(tx, 'entry', entry.id, { dialect: slug, meaning: entry.meaning, notes: entry.notes }, authorId, 'استيراد')
        report.entriesFilled++
      }

      for (const e of w.entries) {
        const dialect = bySlug.get(e.dialect)!
        const formNormalized = normalizeArabic(e.form)
        // Already on this word in this very dialect: keep the one that is there
        // and give it whatever the file adds — examples, a meaning, notes it was
        // missing. Sub-dialects keep their own rows: that شامي and فلسطيني both
        // say «كيفك؟» is worth recording, not deduplicating away.
        const dup = word.links.find(l => l.status === 'active' && l.entry.status === 'active'
          && l.entry.dialectId === dialect.id && l.entry.formNormalized === formNormalized)
        if (dup) {
          report.entriesMerged++
          await fillGaps(dup.entry, e)
          if (e.examples.length) await addExamples(dup.entry.id, e.examples, dup.entry.examples)
          continue
        }
        // The same word in the same dialect may already exist under another
        // headword — «زين» is both جيد and جميل. One entry, linked to both: that
        // is what the link table is for, and the dialect page then shows the
        // form with every MSA word it answers to.
        const shared = await tx.query.entries.findFirst({
          where: and(eq(schema.entries.dialectId, dialect.id), eq(schema.entries.formNormalized, formNormalized), eq(schema.entries.status, 'active')),
          with: { examples: true },
        })
        if (shared) {
          const [link] = await tx.insert(schema.wordEntryLinks).values({ wordId: word.id, entryId: shared.id, createdBy: authorId })
            .onConflictDoNothing().returning()
          if (link) await recordRevision(tx, 'link', link.id, { wordId: word.id, entryId: shared.id }, authorId, 'استيراد')
          report.entriesLinked++
          await fillGaps(shared, e)
          if (e.examples.length) await addExamples(shared.id, e.examples, shared.examples)
          word.links.push({ ...(link ?? { id: 0 }), status: 'active', entry: { ...shared, examples: shared.examples } } as typeof word.links[number])
          continue
        }
        const meaning = echoesWord(e.meaning, e.form, w.headword) ? null : (e.meaning || null)
        const [entry] = await tx.insert(schema.entries).values({ dialectId: dialect.id, form: e.form, formNormalized, meaning, notes: e.notes || null, createdBy: authorId }).returning()
        await recordRevision(tx, 'entry', entry!.id, { dialect: dialect.slug, form: entry!.form, meaning: entry!.meaning, notes: entry!.notes }, authorId, 'استيراد')
        const [link] = await tx.insert(schema.wordEntryLinks).values({ wordId: word.id, entryId: entry!.id, createdBy: authorId }).returning()
        await recordRevision(tx, 'link', link!.id, { wordId: word.id, entryId: entry!.id }, authorId, 'استيراد')
        report.entriesCreated++
        // Keep the in-memory picture current, so a form repeated later in the same
        // file is recognised as the duplicate it is.
        word.links.push({ ...link!, entry: { ...entry!, examples: [] } } as typeof word.links[number])
        await addExamples(entry!.id, e.examples, [])
      }
    })
  }
  if (!body.dryRun) await db.transaction(tx => logModeration(tx, admin?.id ?? authorId, 'import', 'import', 0, `${report.wordsCreated} كلمة جديدة، ${report.wordsMerged} مدمجة، ${report.entriesCreated} مدخل، ${report.examplesCreated} مثال`))
  return report
})
