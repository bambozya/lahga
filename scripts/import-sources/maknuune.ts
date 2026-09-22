/**
 * Converts Maknuune (NYU Abu Dhabi's open Palestinian Arabic lexicon,
 * CC BY-SA 4.0) into two lahga seed files:
 *
 *   npm run seed:maknuune
 *
 * - docs/seed/words-38-maknuune-palestinian.json — a Palestinian entry added
 *   to a word that already exists in lahga's own seed corpus, with that
 *   word's existing entries carried along so the file is self-contained and
 *   `npm run check-variety` reads it correctly.
 * - docs/seed/candidates/maknuune-palestinian-only.json — a Maknuune entry
 *   whose MSA gloss is not yet a lahga headword. Not meant to be imported: a
 *   single dialect's form is not a page by the site's own rule (a word earns
 *   one only once dialects can be shown to differ). Held here so a later
 *   source covering the same MSA word — Egyptian, Gulf, Iraqi — can complete
 *   it, at which point it moves into an ordinary numbered seed file by hand.
 *
 * The source TSV (~36K rows, not committed — see docs/seed/SOURCES.md for
 * the download link and version) has GLOSS_MSA filled in for only some rows;
 * that column, not the English GLOSS, is what supplies a lahga headword,
 * since a headword has to be Arabic script. Maknuune's own forms carry full
 * tashkeel; lahga's do not, so diacritics are stripped on the way in to
 * match the rest of the corpus.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'
import { normalizeArabic } from '../../shared/utils/arabic'
import { capImportedForms, MAX_IMPORTED_FORMS_PER_DIALECT } from './cap'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
// Produced from the raw TSV by a one-line Python preprocessing step (see
// docs/seed/SOURCES.md) rather than parsed here: a handful of Maknuune's
// EXAMPLE_USAGE cells carry an embedded newline, which is valid TSV/CSV
// quoting that a plain split('\n') silently corrupts (columns for that row
// shift, gluing two rows' text together) but Python's csv module reads correctly.
const ROWS_JSON = resolve(HERE, '.maknuune-rows.json')
const OUT_ENRICH = resolve(ROOT, 'docs/seed/words-38-maknuune-palestinian.json')
const OUT_CANDIDATES = resolve(ROOT, 'docs/seed/candidates/maknuune-palestinian-only.json')

const DIACRITICS = /[ً-ْٰـ]/g
const strip = (s: string) => s.replace(DIACRITICS, '').trim()
const hasDiacritics = (s: string) => DIACRITICS.test(s)

type Entry = { dialect: string, form: string, meaning?: string, notes?: string, examples?: { text: string, gloss?: string }[] }
type Word = { headword: string, definition?: string | null, kind?: string, entries: Entry[] }

async function existingHeadwords(): Promise<Map<string, { file: string, word: Word }>> {
  const map = new Map<string, { file: string, word: Word }>()
  for await (const file of glob('docs/seed/words-*.json', { cwd: ROOT })) {
    const doc: { words: Word[] } = JSON.parse(await readFile(resolve(ROOT, file), 'utf8'))
    for (const w of doc.words) {
      const key = normalizeArabic(w.headword)
      if (!map.has(key)) map.set(key, { file, word: w })
    }
  }
  return map
}

/** A gloss short and plain enough to be a headword, not a sentence describing one. */
function looksLikeHeadword(text: string): boolean {
  if (!text) return false
  const words = text.trim().split(/\s+/)
  return words.length <= 3 && text.length <= 30 && !/[.!?؟،]/.test(text)
}

/**
 * Diacritics are usually just spelling convention (بَنّي and بنّي are the
 * same word, written two ways) and normalizeArabic rightly ignores them. For
 * a short function word they can also be the only thing distinguishing two
 * different words — مَن "who" from مِن "from" — where ignoring them would
 * misfile one dialect form under the wrong word entirely. So: for a headword
 * of three letters or fewer that lahga's own copy already carries a
 * diacritic on, the incoming gloss has to carry the identical one too, or it
 * is treated as a different word rather than merged in.
 */
function sameWord(existingHeadword: string, incomingGloss: string): boolean {
  const bare = strip(existingHeadword)
  if (bare.length > 3 || !hasDiacritics(existingHeadword)) return true
  return existingHeadword === incomingGloss.trim()
}

async function main() {
  const rows: Record<string, string>[] = JSON.parse(await readFile(ROWS_JSON, 'utf8'))
  const known = await existingHeadwords()

  const enriched = new Map<string, Word>() // normalized headword -> full word object being built
  const candidates = new Map<string, Word>()
  let skippedNoGloss = 0, skippedNotHeadwordLike = 0, skippedDuplicateHeadword = 0, skippedHomographGuard = 0

  for (const row of rows) {
    const form = strip(row.FORM || row.LEMMA || '')
    if (!form || !row.GLOSS_MSA) { skippedNoGloss++; continue }

    // `#` is Maknuune's own separator for more than one value in a cell: a
    // dialect form with two distinct MSA senses ("إبرة#حقنة"), or more than
    // one example sentence in EXAMPLE_USAGE. Reading the whole cell as one
    // string — the first pass here did — puts a literal "#" into a headword
    // or glues two unrelated example sentences into one, which the importer's
    // Arabic-only check then rightly rejects.
    const examples = (row.EXAMPLE_USAGE ?? '')
      .split('#')
      .map(s => strip(s).replace(/\[auto\]$/, '').replace(/_$/, '').trim())
      .filter(s => s.length >= 3)
      .map(text => ({ text }))

    const glosses = row.GLOSS_MSA.split('#').map(s => s.trim()).filter(Boolean)
    for (const rawGloss of glosses) {
      const glossMsa = strip(rawGloss)
      if (!looksLikeHeadword(glossMsa)) { skippedNotHeadwordLike++; continue }
      const key = normalizeArabic(glossMsa)
      const entry: Entry = { dialect: 'palestinian', form, ...(examples.length ? { examples } : {}) }

      const hit = known.get(key)
      if (hit) {
        if (!sameWord(hit.word.headword, rawGloss)) { skippedHomographGuard++; continue }
        if (!enriched.has(key)) {
          // Carry the word's existing entries along so this file stands on
          // its own for check-variety, and re-importing the old entries is a
          // no-op (the importer skips a form already present in the same dialect).
          enriched.set(key, { headword: hit.word.headword, definition: hit.word.definition, kind: hit.word.kind, entries: [...hit.word.entries] })
        }
        const already = enriched.get(key)!.entries.some(e => e.dialect === 'palestinian' && normalizeArabic(e.form) === normalizeArabic(form))
        if (!already) enriched.get(key)!.entries.push(entry)
        continue
      }

      if (candidates.has(key)) { skippedDuplicateHeadword++; continue } // keep the first Palestinian form per new concept
      candidates.set(key, { headword: glossMsa, entries: [entry] })
    }
  }

  // At most MAX_IMPORTED_FORMS_PER_DIALECT Palestinian forms from Maknuune per
  // word. The entries carried over from lahga's own files come first in the
  // list and are hand-written; everything after them is Maknuune's.
  let capped = 0
  for (const [key, word] of enriched) {
    const own = known.get(key)!.word.entries.length
    const handwritten = word.entries.slice(0, own).filter(e => e.dialect === 'palestinian').length
    const { keep, drop } = capImportedForms(word.headword, handwritten, word.entries.slice(own))
    capped += drop.length
    word.entries = [...word.entries.slice(0, own), ...keep]
  }

  await mkdir(dirname(OUT_ENRICH), { recursive: true })
  await mkdir(dirname(OUT_CANDIDATES), { recursive: true })
  await writeFile(OUT_ENRICH, JSON.stringify({ words: [...enriched.values()] }, null, 2) + '\n')
  await writeFile(OUT_CANDIDATES, JSON.stringify({ words: [...candidates.values()] }, null, 2) + '\n')

  console.log(`rows read: ${rows.length}`)
  console.log(`skipped, no usable GLOSS_MSA: ${skippedNoGloss}`)
  console.log(`skipped, gloss too sentence-like: ${skippedNotHeadwordLike}`)
  console.log(`skipped, duplicate new headword (kept first): ${skippedDuplicateHeadword}`)
  console.log(`skipped, short-word homograph guard: ${skippedHomographGuard}`)
  console.log(`words enriched (already in lahga, gained a Palestinian entry): ${enriched.size}`)
  console.log(`Palestinian forms dropped, over ${MAX_IMPORTED_FORMS_PER_DIALECT} per word: ${capped}`)
  console.log(`candidates held back (new to lahga, Palestinian-only so far): ${candidates.size}`)
  console.log(`→ ${OUT_ENRICH}`)
  console.log(`→ ${OUT_CANDIDATES}`)
}

main()
