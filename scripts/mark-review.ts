/**
 * Tags forms already on a site as «needs checking» (word_entry_links.needs_review)
 * through /api/admin/review-marks. Nothing is created or changed but the mark.
 *
 *   npm run mark-review -- docs/seed/words-73-llm-najdi.json@najdi          # count only
 *   npm run mark-review -- --review docs/seed/LLM-REVIEW.md --url https://lahga.fyi --commit
 *
 * What it reads:
 *   file.json            every entry carrying `"review": true`
 *   file.json@dialect    every entry of that dialect (a whole draft column)
 *   --review file.md     the «least sure» lines of LLM-REVIEW.md:
 *                        «- headword · dialect[/dialect] · form ; · dialect · form ; …»
 *                        (a part that starts with «·» keeps the headword before it;
 *                        a note in brackets after a form is dropped)
 *
 * A line that matches nothing on the site is listed, not an error: the form may
 * have been corrected or removed since. Token and --url work as in the import.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fromReview, fromSeed, type Item } from './lib/review-items'

type Report = { marked: number, alreadyMarked: number, missing: string[] }

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const commit = args.includes('--commit')
const url = (flag('url') ?? 'http://localhost:3000').replace(/\/$/, '')
const reviewFile = flag('review')
const sources = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--review' && args[i - 1] !== '--url' && args[i - 1] !== '--token' && /\.json(@[a-z]+)?$/.test(a))

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
  die('No import token. Put IMPORT_TOKEN in .env or pass --token.')
}

const items: Item[] = []
for (const s of sources) items.push(...await fromSeed(s))
if (reviewFile) items.push(...fromReview(await readFile(resolve(reviewFile), 'utf8')))
const unique = [...new Map(items.map(i => [`${i.headword}\u0000${i.dialect}\u0000${i.form}`, i])).values()]
if (!unique.length) die('Nothing to mark. Usage: npm run mark-review -- <file.json[@dialect]…> [--review LLM-REVIEW.md] [--url …] [--commit]')

const bearer = await token()
const total: Report = { marked: 0, alreadyMarked: 0, missing: [] }
for (let i = 0; i < unique.length; i += 1000) {
  const res = await fetch(`${url}/api/admin/review-marks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ items: unique.slice(i, i + 1000), dryRun: !commit }),
  })
  const body = await res.text()
  if (!res.ok) die(`${url} answered ${res.status}: ${body.slice(0, 300)}`)
  const r = JSON.parse(body) as Report
  total.marked += r.marked; total.alreadyMarked += r.alreadyMarked; total.missing.push(...r.missing)
}

console.log(`\n  ${unique.length} forms read: ${total.marked} ${commit ? 'marked' : 'would be marked'}, ${total.alreadyMarked} already marked, ${total.missing.length} not found on ${url}`)
for (const m of total.missing.slice(0, 40)) console.log(`    ? ${m}`)
if (total.missing.length > 40) console.log(`    … and ${total.missing.length - 40} more`)
if (!commit) console.log('\n  Nothing saved. Add --commit to mark them.')
console.log()
