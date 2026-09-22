/**
 * Caps how many forms an imported source may give one dialect on a word, in
 * the seed file and on the site.
 *
 *   npm run retire-extra -- docs/seed/words-38-maknuune-palestinian.json palestinian
 *   npm run retire-extra -- docs/seed/words-38-maknuune-palestinian.json palestinian --commit
 *   npm run retire-extra -- <file> <dialect> --url https://lahga.fyi --commit
 *
 * Without --commit it only reports. With it, the file is rewritten without the
 * extra forms and the same forms are retired on the site through
 * POST /api/admin/retire-entries, so a later re-import cannot bring them back.
 *
 * Which forms are "imported": the ones in the file that no hand-written seed
 * file carries for that word and dialect. The hand-written ones stay and count
 * toward the cap (scripts/import-sources/cap.ts). The files a converter wrote
 * (GENERATED below) carry each other's entries along, so they are not
 * hand-written, and a form retired from one is dropped from the others too;
 * otherwise re-importing the other file would bring it back. The token is read
 * the same way as by scripts/import.ts.
 */
import { readFile, writeFile, glob } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeArabic } from '../shared/utils/arabic'
import { capImportedForms, MAX_IMPORTED_FORMS_PER_DIALECT } from './import-sources/cap'

type Entry = { dialect: string, form: string, examples?: unknown[] }
type Word = { headword: string, entries: Entry[] }

/** Seed files written by scripts/import-sources/*, not by hand. */
const GENERATED = ['words-38-maknuune-palestinian.json', 'words-39-peace-corps-jordan.json']
const isGenerated = (path: string) => GENERATED.some(g => path.endsWith(g))

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const commit = args.includes('--commit')
const url = (flag('url') ?? 'http://localhost:3000').replace(/\/$/, '')
const [file, dialect] = args.filter(a => !a.startsWith('--') && a !== flag('url') && a !== flag('token'))
if (!file || !dialect) die('Usage: npm run retire-extra -- <seed file> <dialect slug> [--commit] [--url https://lahga.fyi] [--token …]')

function die(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

async function token(): Promise<string> {
  const given = flag('token') ?? process.env.IMPORT_TOKEN
  if (given) return given
  try {
    const env = await readFile(resolve(process.cwd(), '.env'), 'utf8')
    const line = env.split('\n').find(l => l.trim().startsWith('IMPORT_TOKEN='))
    const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    if (value) return value
  } catch { /* no .env */ }
  die('No import token. Put IMPORT_TOKEN=<32+ characters> in .env, or pass --token.')
}

/** headword → the forms the hand-written seed files give this dialect. */
async function handwrittenForms(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  for await (const other of glob('docs/seed/words-*.json')) {
    if (resolve(other) === resolve(file!) || isGenerated(other)) continue
    const doc: { words: Word[] } = JSON.parse(await readFile(other, 'utf8'))
    for (const w of doc.words) {
      const key = normalizeArabic(w.headword)
      if (!map.has(key)) map.set(key, new Set())
      for (const e of w.entries) if (e.dialect === dialect) map.get(key)!.add(normalizeArabic(e.form))
    }
  }
  return map
}

const doc: { words: Word[] } = JSON.parse(await readFile(file!, 'utf8'))
const known = await handwrittenForms()
const removed: { headword: string, dialect: string, form: string }[] = []
let wordsTouched = 0

for (const w of doc.words) {
  const own = known.get(normalizeArabic(w.headword)) ?? new Set()
  const inDialect = w.entries.filter(e => e.dialect === dialect)
  const handwritten = inDialect.filter(e => own.has(normalizeArabic(e.form)))
  const imported = inDialect.filter(e => !own.has(normalizeArabic(e.form)))
  const { drop } = capImportedForms(w.headword, handwritten.length, imported)
  if (!drop.length) continue
  wordsTouched++
  for (const e of drop) removed.push({ headword: w.headword, dialect, form: e.form })
  w.entries = w.entries.filter(e => !drop.includes(e))
}

console.log(`${doc.words.length} words in ${file}; cap ${MAX_IMPORTED_FORMS_PER_DIALECT} ${dialect} forms from the source per word`)
console.log(`${wordsTouched} words over the cap, ${removed.length} forms to retire`)
const byWord = new Map<string, string[]>()
for (const r of removed) byWord.set(r.headword, [...(byWord.get(r.headword) ?? []), r.form])
for (const [h, forms] of [...byWord].sort((a, b) => b[1].length - a[1].length).slice(0, 8)) console.log(`  ${h}: ${forms.join('، ')}`)
if (byWord.size > 8) console.log(`  … and ${byWord.size - 8} more words`)

if (!removed.length) process.exit(0)

// The site first: if it refuses, the file stays as it was and the two agree.
const res = await fetch(`${url}/api/admin/retire-entries`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${await token()}` },
  body: JSON.stringify({ entries: removed, dryRun: !commit, reason: `أكثر من ${MAX_IMPORTED_FORMS_PER_DIALECT} صيغ ${dialect} من مصدر مستورد` }),
}).catch(() => die(`Cannot reach ${url}. Is the site running? Pass --url for another address.`))
const body = await res.text()
if (!res.ok) die(`${url} answered ${res.status}: ${(() => { try { return JSON.parse(body).statusMessage ?? body } catch { return body } })()}`)
const report = JSON.parse(body) as { retired: number, unlinkedOnly: number, notFound: string[] }
console.log(`${url}: ${report.retired} retired, ${report.unlinkedOnly} unlinked from this word only, ${report.notFound.length} not found${commit ? '' : ' (dry run)'}`)
for (const n of report.notFound.slice(0, 10)) console.log(`  not on the site: ${n}`)

if (commit) {
  await writeFile(file!, JSON.stringify(doc, null, 2) + '\n')
  console.log(`${file} rewritten`)
  // The other generated files carry these forms too; keep them in step.
  const gone = new Set(removed.map(r => `${normalizeArabic(r.headword)}|${normalizeArabic(r.form)}`))
  for await (const other of glob('docs/seed/words-*.json')) {
    if (resolve(other) === resolve(file!) || !isGenerated(other)) continue
    const otherDoc: { words: Word[] } = JSON.parse(await readFile(other, 'utf8'))
    let dropped = 0
    for (const w of otherDoc.words) {
      const before = w.entries.length
      w.entries = w.entries.filter(e => !(e.dialect === dialect && gone.has(`${normalizeArabic(w.headword)}|${normalizeArabic(e.form)}`)))
      dropped += before - w.entries.length
    }
    if (dropped) {
      await writeFile(other, JSON.stringify(otherDoc, null, 2) + '\n')
      console.log(`${other}: ${dropped} of the same forms dropped`)
    }
  }
} else {
  console.log('Nothing changed. Add --commit to retire on the site and rewrite the file.')
}
