/**
 * Converts Peace Corps Jordan's pre-departure Arabic phrasebook (US
 * government work, public domain) into the same two-file shape the Maknuune
 * script produces:
 *
 *   npm run seed:peace-corps-jordan
 *
 * Unlike Maknuune this is not machine-parsed from the source. The PDF's text
 * layer has two independent problems that make automated extraction unsafe
 * here: a multi-word Arabic phrase comes out with its words in reverse order
 * (character order within each word is fine — this is a well-known PDF/RTL
 * extraction artifact), and the letter ك is dropped or mangled in some
 * words but not others, inconsistently, for reasons that were not worth
 * chasing down in a 24-page source. Automating a "fix" for either risked
 * silently writing wrong Arabic with high confidence, which is worse than
 * not importing at all.
 *
 * So this is a hand-verified list instead: every entry below was checked
 * against the source's own Latin transliteration (which extracts cleanly)
 * and standard Jordanian/Levantine spelling, not copied from the PDF's
 * Arabic column as-is. See docs/seed/SOURCES.md for the source link, the
 * lessons it was drawn from, and what was left out (full sentences,
 * pan-Arabic/Islamic formulas that read identically in MSA — "السلام
 * عليكم", "الحمد لله" — and a page of numbers 0–10 already well covered).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'
import { normalizeArabic } from '../../shared/utils/arabic'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT_ENRICH = resolve(ROOT, 'docs/seed/words-39-peace-corps-jordan.json')
const OUT_CANDIDATES = resolve(ROOT, 'docs/seed/candidates/peace-corps-jordan-only.json')

type Entry = { dialect: string, form: string }
type Word = { headword: string, definition?: string | null, kind?: string, entries: Entry[] }

/** headword (MSA), the Jordanian form. Both read by hand from the source, cross-checked against its transliteration. */
const PAIRS: [string, string][] = [
  ['أهلاً وسهلاً', 'هلا'],
  ['جيد', 'كويس'],
  ['نعم', 'أيوا'],
  ['هنا', 'هون'],
  ['الآن', 'هسا'],
  ['حسناً', 'طيب'],
  ['أب', 'أبو'],
  ['أخ', 'أخو'],
  ['ماء', 'مي'],
  ['لذيذ', 'زاكي'],
  ['غداً', 'بكرة'],
  ['مبكراً', 'بكير'],
  ['متأخراً', 'متأخر'],
  ['أمس', 'امبارح'],
  ['يسار', 'شمال'],
  ['مستقيم', 'دغري'],
  ['جبن', 'جبنة'],
  ['أرز', 'رز'],
  // New to lahga — held back as candidates, not imported, until a second
  // dialect completes one of these into a real, divergent word.
  ['سعيد', 'مبسوط'],
  ['متعب', 'تعبان'],
  ['بنت', 'بنت'],
  ['خضروات', 'خضار'],
  ['إفطار', 'فطور'],
  ['غداء', 'غدا'],
  ['عشاء', 'عشا'],
  ['جائع', 'جوعان'],
  ['أين', 'وين'],
  ['أسبوع', 'اسبوع'],
  ['ملح', 'ملح'],
]

async function existingHeadwords(): Promise<Map<string, Word>> {
  const map = new Map<string, Word>()
  for await (const file of glob('docs/seed/words-*.json', { cwd: ROOT })) {
    const doc: { words: Word[] } = JSON.parse(await readFile(resolve(ROOT, file), 'utf8'))
    for (const w of doc.words) {
      const key = normalizeArabic(w.headword)
      if (!map.has(key)) map.set(key, w)
    }
  }
  return map
}

async function main() {
  const known = await existingHeadwords()
  const enriched = new Map<string, Word>()
  const candidates = new Map<string, Word>()

  for (const [headword, form] of PAIRS) {
    const key = normalizeArabic(headword)
    const entry: Entry = { dialect: 'jordanian', form }
    const hit = known.get(key)
    if (hit) {
      if (!enriched.has(key)) enriched.set(key, { headword: hit.headword, definition: hit.definition, kind: hit.kind, entries: [...hit.entries] })
      if (!enriched.get(key)!.entries.some(e => e.dialect === 'jordanian' && normalizeArabic(e.form) === normalizeArabic(form))) {
        enriched.get(key)!.entries.push(entry)
      }
    } else {
      candidates.set(key, { headword, entries: [entry] })
    }
  }

  await mkdir(dirname(OUT_ENRICH), { recursive: true })
  await mkdir(dirname(OUT_CANDIDATES), { recursive: true })
  await writeFile(OUT_ENRICH, JSON.stringify({ words: [...enriched.values()] }, null, 2) + '\n')
  await writeFile(OUT_CANDIDATES, JSON.stringify({ words: [...candidates.values()] }, null, 2) + '\n')

  console.log(`words enriched: ${enriched.size}`)
  console.log(`candidates held back: ${candidates.size}`)
  console.log(`→ ${OUT_ENRICH}`)
  console.log(`→ ${OUT_CANDIDATES}`)
}

main()
