/**
 * Folds entries that share a form inside one dialect group onto the group itself.
 *
 *   npm run fold-dialects -- docs/seed/words-15-travel.json
 *
 * The importer treats a form as a duplicate when it already exists anywhere in
 * the same dialect group, so writing «بنو» three times for moroccan, algerian
 * and tunisian keeps only the first and quietly drops the rest — and the page
 * then claims the word is Moroccan alone. One entry on `maghrebi` says the true
 * thing and survives the import. Entries that differ are left alone.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dialectTree, type DialectSeed } from '../server/db/seed-data'
import { normalizeArabic } from '../shared/utils/arabic'

type Example = { text: string, gloss?: string }
type Entry = { dialect: string, form: string, meaning?: string, notes?: string, examples?: Example[] }
type Word = { headword: string, entries: Entry[] }

const parent = new Map<string, string>()
const walk = (list: DialectSeed[], top: string | null) => {
  for (const d of list) {
    parent.set(d.slug, top ?? d.slug)
    if (d.children) walk(d.children, top ?? d.slug)
  }
}
walk(dialectTree, null)

const files = process.argv.slice(2).filter(a => a.endsWith('.json'))
if (!files.length) {
  console.error('\n  Usage: npm run fold-dialects -- <seed-file.json…>\n')
  process.exit(1)
}

for (const file of files) {
  const doc: { words: Word[] } = JSON.parse(await readFile(resolve(file), 'utf8'))
  let folded = 0
  const notes: string[] = []
  for (const w of doc.words) {
    const buckets = new Map<string, Entry[]>()
    for (const e of w.entries) {
      const k = `${parent.get(e.dialect) ?? e.dialect}|${normalizeArabic(e.form)}`
      buckets.set(k, [...(buckets.get(k) ?? []), e])
    }
    const kept: Entry[] = []
    for (const [k, group] of buckets) {
      if (group.length === 1) { kept.push(group[0]!); continue }
      const groupSlug = k.split('|')[0]!
      const first = group[0]!
      const examples: Example[] = []
      for (const e of group) for (const x of e.examples ?? []) {
        if (!examples.some(y => normalizeArabic(y.text) === normalizeArabic(x.text))) examples.push(x)
      }
      kept.push({
        dialect: groupSlug,
        form: first.form,
        ...(group.find(e => e.meaning)?.meaning ? { meaning: group.find(e => e.meaning)!.meaning } : {}),
        ...(group.find(e => e.notes)?.notes ? { notes: group.find(e => e.notes)!.notes } : {}),
        ...(examples.length ? { examples } : {}),
      })
      folded += group.length - 1
      notes.push(`${w.headword}: ${first.form} (${group.map(e => e.dialect).join('، ')}) → ${groupSlug}`)
    }
    w.entries = kept
  }
  await writeFile(resolve(file), JSON.stringify(doc, null, 1) + '\n', 'utf8')
  console.log(`\n  ${file}: ${folded} entries folded onto their group`)
  for (const n of notes.slice(0, 5)) console.log(`      ${n}`)
  if (notes.length > 5) console.log(`      …and ${notes.length - 5} more`)
}
console.log()
