import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import * as v from 'valibot'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { echoesWord } from '../../utils/contribute'

/**
 * Clears the text that only says the word again (admin, or the IMPORT_TOKEN
 * bearer that the importer accepts).
 *
 * Early seed batches filled every field they had: «أخ» was defined as «الأخ»,
 * and the Egyptian form «عربية» was glossed «السيارة» on the page of سيارة. A
 * line that repeats its own heading is not a definition, it is furniture, and
 * both fields are optional now — a word carries its definition for the whole
 * page, so a dialect form only needs a meaning when it says something the
 * headword does not.
 *
 * Two kinds, either or both:
 *   definitions — a word's definition that is its own headword again
 *   meanings    — an entry's meaning that is its own form, or the MSA headword
 *                 it is already filed under
 *
 * Matching ignores the definite article, the usual spelling drift and a
 * trailing full stop, so «أخ»/«الأخ» and «السيارة.»/«سيارة» count as the same.
 *
 * `dryRun` (the default) changes nothing and returns every line it would clear,
 * which is how the batch is kept before it goes.
 */
const Body = v.object({
  dryRun: v.optional(v.boolean(), true),
  definitions: v.optional(v.boolean(), true),
  meanings: v.optional(v.boolean(), true),
  reason: v.optional(v.string(), 'نص يكرّر الكلمة نفسها'),
})

export default defineEventHandler(async (event) => {
  const admin = await requireImporter(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const authorId = admin?.id ?? await systemUserId(db)
  const cleared = { definitions: [] as string[], meanings: [] as string[] }

  if (body.definitions) {
    const words = await db.select({ id: schema.words.id, headword: schema.words.headword, definition: schema.words.definition })
      .from(schema.words)
      .where(and(eq(schema.words.status, 'active'), isNotNull(schema.words.definition)))
    const ids: number[] = []
    for (const w of words) {
      if (!echoesWord(w.definition, w.headword)) continue
      ids.push(w.id)
      cleared.definitions.push(`${w.headword} — ${w.definition}`)
    }
    if (!body.dryRun) await inChunks(ids, chunk => db.update(schema.words)
      .set({ definition: null, updatedAt: new Date() }).where(inArray(schema.words.id, chunk)))
  }

  if (body.meanings) {
    // An entry can hang under more than one headword; any of them repeated is a repeat.
    const rows = await db.select({
      id: schema.entries.id, form: schema.entries.form, meaning: schema.entries.meaning,
      headword: schema.words.headword,
    })
      .from(schema.entries)
      .leftJoin(schema.wordEntryLinks, and(
        eq(schema.wordEntryLinks.entryId, schema.entries.id),
        eq(schema.wordEntryLinks.status, 'active'),
      ))
      .leftJoin(schema.words, eq(schema.words.id, schema.wordEntryLinks.wordId))
      .where(and(eq(schema.entries.status, 'active'), isNotNull(schema.entries.meaning)))

    const echo = new Map<number, string>()
    const real = new Set<number>()
    for (const r of rows) {
      if (echoesWord(r.meaning, r.form, r.headword)) echo.set(r.id, `${r.form} — ${r.meaning}`)
      else real.add(r.id)
    }
    // A meaning that repeats one headword but says something under another stays.
    for (const id of real) echo.delete(id)
    const ids = [...echo.keys()]
    cleared.meanings = [...echo.values()]
    if (!body.dryRun) await inChunks(ids, chunk => db.update(schema.entries)
      .set({ meaning: null, updatedAt: new Date() }).where(inArray(schema.entries.id, chunk)))
  }

  if (!body.dryRun && (cleared.definitions.length || cleared.meanings.length)) {
    await db.transaction(tx => logModeration(tx, authorId, 'tidy', 'word', 0,
      `${cleared.definitions.length} تعريف، ${cleared.meanings.length} معنى — ${body.reason}`))
  }
  return {
    definitionsCleared: cleared.definitions.length,
    meaningsCleared: cleared.meanings.length,
    dryRun: body.dryRun,
    // The text itself, so a dry run is also the backup of what the real one removes.
    cleared: body.dryRun ? cleared : undefined,
  }
})

/** Postgres has a limit on parameters per statement; 500 ids at a time is well inside it. */
async function inChunks(ids: number[], run: (chunk: number[]) => Promise<unknown>) {
  for (let i = 0; i < ids.length; i += 500) await run(ids.slice(i, i + 500))
}
