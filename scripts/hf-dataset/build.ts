/**
 * Builds the folder that is uploaded to Hugging Face as a dataset
 * (docs/DISCOVERY.md, «Publish the dataset where models are trained from»).
 * Nothing is uploaded from here: the folder is dragged into the dataset's
 * «Files» tab, or pushed with the `hf` command.
 *
 *   npm run hf:build                                  # from https://lahga.fyi
 *   npm run hf:build -- --repo lahga/arabic-dialects  # the name the card's code sample uses
 *   npm run hf:build -- --url http://localhost:3000 --out /tmp/hf
 *
 * What it reads: the site's own export, /data/lahga.json, and nothing else.
 * So the dataset can never hold more than the site already publishes, and a
 * new snapshot is this one command.
 *
 * What it writes, into .data/hf-dataset/ unless --out says otherwise:
 *   README.md        the dataset card: card.md beside this file, with the
 *                    counts and the coverage table filled in
 *   entries.jsonl    one dialect form per line (the default table)
 *   examples.jsonl   one example sentence per line, with its gloss in MSA
 *   dialects.jsonl   one variety per line
 *   lahga.json       the export itself, untouched
 *
 * JSON Lines rather than CSV for the tables: the notes hold commas, quotes and
 * line breaks, and a CSV reader that guesses types turns an empty cell and the
 * word «null» into the same thing.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExportData } from '../../server/utils/exportData'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const url = (flag('url') ?? 'https://lahga.fyi').replace(/\/$/, '')
const out = resolve(flag('out') ?? '.data/hf-dataset')
const repo = flag('repo') ?? 'lahga/arabic-dialects'

function die(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const res = await fetch(`${url}/data/lahga.json`).catch(() => undefined)
if (!res?.ok) die(`${url}/data/lahga.json did not answer (${res?.status ?? 'no connection'}).`)
const raw = await res.text()
const data = JSON.parse(raw) as ExportData

// The card tells its reader which forms no speaker has confirmed. An export
// from before that field existed cannot back the claim, so nothing is built.
if (typeof data.meta.needs_review !== 'number' || data.words.some(w => w.entries.some(e => typeof e.needs_review !== 'boolean'))) {
  die(`The export at ${url} has no needs_review field yet. Deploy the current server/utils/exportData.ts first.`)
}

const dialect = new Map(data.dialects.map(d => [d.slug, d]))
const group = (slug: string) => dialect.get(slug)?.parent ?? slug

const entries: Record<string, unknown>[] = []
const examples: Record<string, unknown>[] = []
const perDialect = new Map<string, { forms: number, unconfirmed: number }>()
for (const w of data.words) {
  for (const e of w.entries) {
    const d = dialect.get(e.dialect)
    entries.push({
      headword: w.headword, kind: w.kind, definition: w.definition,
      form: e.form, dialect: e.dialect, dialect_name: d?.name ?? null, dialect_group: group(e.dialect), language: e.language,
      meaning: e.meaning, notes: e.notes, needs_review: e.needs_review, examples: e.examples.length,
      entry_id: e.id, word_id: w.id, source: w.source,
    })
    for (const x of e.examples) {
      examples.push({
        text: x.text, gloss: x.gloss, form: e.form, headword: w.headword,
        dialect: e.dialect, dialect_group: group(e.dialect), language: e.language, needs_review: e.needs_review,
        example_id: x.id, entry_id: e.id, word_id: w.id, source: w.source,
      })
    }
    const tally = perDialect.get(e.dialect) ?? { forms: 0, unconfirmed: 0 }
    tally.forms++
    if (e.needs_review) tally.unconfirmed++
    perDialect.set(e.dialect, tally)
  }
}
const dialects = data.dialects.map(d => ({ ...d, forms: perDialect.get(d.slug)?.forms ?? 0 }))

// Counted here, not taken from meta: the card must agree with the files beside it.
const unconfirmed = entries.filter(e => e.needs_review).length
const n = (v: number) => v.toLocaleString('en-US')
const share = (part: number, whole: number) => whole ? `${Math.round(part / whole * 100)}%` : '0%'

// A group first, then the varieties under it, in the site's own order.
const groups = data.dialects.filter(d => !d.parent)
const rows = groups.flatMap(g => [g, ...data.dialects.filter(d => d.parent === g.slug)])
  .filter(d => perDialect.has(d.slug))
  .map((d) => {
    const t = perDialect.get(d.slug)!
    return `| ${d.parent ? '· ' : ''}${d.name} | \`${d.slug}\` | \`${d.language}\` | ${n(t.forms)} | ${n(t.unconfirmed)} |`
  })
const coverage = ['| Variety | `dialect` | `language` | Forms | Not yet confirmed |', '|---|---|---|---:|---:|', ...rows].join('\n')

// The card's `language:` list wants bare ISO 639 codes: «apc-PS» is listed as «apc».
const codes = [...new Set(['ar', ...[...perDialect.keys()].map(s => dialect.get(s)!.language.split('-')[0]!)])]
  .filter(c => /^[a-z]{2,3}$/.test(c))
const size = entries.length < 1_000 ? 'n<1K' : entries.length < 10_000 ? '1K<n<10K' : entries.length < 100_000 ? '10K<n<100K' : '100K<n<1M'

const fill: Record<string, string> = {
  languages: codes.map(c => `- ${c}`).join('\n'),
  size,
  repo,
  site: data.meta.url,
  date: data.meta.generated.slice(0, 10),
  year: data.meta.generated.slice(0, 4),
  words: n(data.words.length),
  entries: n(entries.length),
  examples: n(examples.length),
  dialects: n(perDialect.size),
  unconfirmed: n(unconfirmed),
  unconfirmed_share: share(unconfirmed, entries.length),
  coverage,
}
const template = await readFile(resolve(dirname(fileURLToPath(import.meta.url)), 'card.md'), 'utf8')
const card = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fill[key] ?? die(`card.md asks for {{${key}}}, which the build does not know.`))

const jsonl = (list: unknown[]) => list.map(r => JSON.stringify(r)).join('\n') + '\n'
await mkdir(out, { recursive: true })
await Promise.all([
  writeFile(resolve(out, 'README.md'), card),
  writeFile(resolve(out, 'entries.jsonl'), jsonl(entries)),
  writeFile(resolve(out, 'examples.jsonl'), jsonl(examples)),
  writeFile(resolve(out, 'dialects.jsonl'), jsonl(dialects)),
  writeFile(resolve(out, 'lahga.json'), raw),
])

console.log(`
  ${out}
    README.md       the card, as of ${fill.date}
    entries.jsonl   ${fill.entries} forms (${fill.unconfirmed} not yet confirmed)
    examples.jsonl  ${fill.examples} examples
    dialects.jsonl  ${dialects.length} varieties, ${fill.dialects} with forms
    lahga.json      ${fill.words} words

  Upload: huggingface.co/datasets/${repo} → Files → Add file → Upload files, all five.
`)
