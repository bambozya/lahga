/**
 * Merges drafted examples into a seed file, so the file stays the source of
 * truth and `npm run import` can carry them to the site.
 *
 *   npm run add-examples -- drafts/social-01.json docs/seed/words-02-social.json
 *
 * The draft is a list of { headword, dialect, form, text, gloss? }. Each one is
 * matched to its entry by those three fields; an example whose text is already
 * on that entry is left alone, and anything that matches no entry is reported
 * rather than silently dropped.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeArabic } from '../shared/utils/arabic'

type Draft = { headword: string, dialect: string, form: string, text: string, gloss?: string }
type Entry = { dialect: string, form: string, examples?: { text: string, gloss?: string }[] }
type Word = { headword: string, entries: Entry[] }

const [draftPath, seedPath] = process.argv.slice(2)
if (!draftPath || !seedPath) {
  console.error('\n  Usage: npm run add-examples -- <draft.json> <seed-file.json>\n')
  process.exit(1)
}

const drafts: Draft[] = JSON.parse(await readFile(resolve(draftPath), 'utf8'))
const seed: { words: Word[] } = JSON.parse(await readFile(resolve(seedPath), 'utf8'))

const key = (headword: string, dialect: string, form: string) =>
  `${normalizeArabic(headword)}|${dialect}|${normalizeArabic(form)}`
const entries = new Map<string, Entry>()
for (const w of seed.words) for (const e of w.entries) entries.set(key(w.headword, e.dialect, e.form), e)

let added = 0, already = 0
const missed: Draft[] = []
for (const d of drafts) {
  const entry = entries.get(key(d.headword, d.dialect, d.form))
  if (!entry) { missed.push(d); continue }
  entry.examples ??= []
  if (entry.examples.some(x => normalizeArabic(x.text) === normalizeArabic(d.text))) { already++; continue }
  entry.examples.push(d.gloss ? { text: d.text, gloss: d.gloss } : { text: d.text })
  added++
}

await writeFile(resolve(seedPath), JSON.stringify(seed, null, 1).replace(/\n$/, '') + '\n', 'utf8')
console.log(`\n  ${added} added, ${already} already there, ${missed.length} matched no entry`)
for (const m of missed) console.log(`    ✗ ${m.headword} · ${m.dialect} · ${m.form}`)
console.log()
process.exit(missed.length ? 1 : 0)
