/**
 * How much does a word actually differ across dialects?
 *
 *   npm run check-variety -- docs/seed/words-34-sayings.json
 *   npm run check-variety -- docs/seed/words-*.json --all
 *
 * A word whose form is the same everywhere teaches nobody anything: الحمد لله
 * is الحمد لله from Casablanca to Basra, and a page for it is a page of noise.
 * This counts the distinct forms behind a headword, ignoring the definite
 * article and the usual spelling drift, and flags the ones not worth a page.
 *
 * Exit code 1 if any word in the files falls below the bar, so it can gate an
 * import.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeArabic } from '../shared/utils/arabic'

type Entry = { dialect: string, form: string }
type Word = { headword: string, entries: Entry[] }

/** الفار and فار are the same word; so are يرحمه and يرحمو. */
const key = (form: string) => normalizeArabic(form)
  .replace(/^(ال|لل)/, '')
  .replace(/[وه]$/, 'ه')
  .replace(/\s+/g, ' ')

const files = process.argv.slice(2).filter(a => a.endsWith('.json'))
const showAll = process.argv.includes('--all')
if (!files.length) {
  console.error('\n  Usage: npm run check-variety -- <seed-file.json…> [--all]\n')
  process.exit(1)
}

let weak = 0, total = 0
const rows: { forms: number, headword: string, file: string, sample: string }[] = []
for (const file of files) {
  const doc: { words: Word[] } = JSON.parse(await readFile(resolve(file), 'utf8'))
  for (const w of doc.words) {
    total++
    const distinct = new Set(w.entries.map(e => key(e.form)))
    if (distinct.size <= 2) {
      weak++
      rows.push({
        forms: distinct.size,
        headword: w.headword,
        file: file.split('/').pop()!,
        sample: [...distinct].slice(0, 3).join(' / '),
      })
    }
  }
}
rows.sort((a, b) => a.forms - b.forms || a.headword.localeCompare(b.headword))
const shown = showAll ? rows : rows.slice(0, 30)
console.log(`\n  ${weak} of ${total} words have two or fewer distinct forms across every dialect:\n`)
for (const r of shown) console.log(`   ${r.forms} form${r.forms === 1 ? ' ' : 's'}  ${r.headword.padEnd(18)} ${r.sample.padEnd(34)} ${r.file}`)
if (rows.length > shown.length) console.log(`   …and ${rows.length - shown.length} more (pass --all)`)
console.log()
process.exit(weak ? 1 : 0)
