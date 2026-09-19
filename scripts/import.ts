/**
 * Loads seed files into a running site through /api/admin/import.
 *
 * Re-running a file is how content grows: words and forms already present are
 * left alone, and any examples the file has gained are added to them.
 *
 *   npm run import -- docs/seed/words-*.json            # check only, saves nothing
 *   npm run import -- docs/seed/words-02-social.json --commit
 *   npm run import -- file.json --url https://lahga.fyi --commit
 *
 * Every chunk is validated first ("تحقق"); a chunk with errors is never saved,
 * and --commit stops at the first file that fails. Authentication is the
 * IMPORT_TOKEN from .env (or --token); the importer accepts it as a bearer
 * token and files the content under the site account «لهجة».
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const CHUNK = 500 // the importer's limit per request

type Report = {
  wordsCreated: number, wordsMerged: number, entriesCreated: number,
  entriesMerged: number, entriesLinked: number, entriesFilled: number,
  examplesCreated: number, examplesSkipped: number,
  errors: { index: number, headword?: string, message: string }[]
}

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}
const commit = args.includes('--commit')
const url = (flag('url') ?? 'http://localhost:3000').replace(/\/$/, '')
const files = args.filter(a => !a.startsWith('--') && a.endsWith('.json'))
  .filter((_, i, all) => all.indexOf(_) === i)

/** IMPORT_TOKEN lives in .env, which this script reads itself (Nuxt is not running here). */
async function token(): Promise<string> {
  const given = flag('token') ?? process.env.IMPORT_TOKEN
  if (given) return given
  try {
    const env = await readFile(resolve(process.cwd(), '.env'), 'utf8')
    const line = env.split('\n').find(l => l.trim().startsWith('IMPORT_TOKEN='))
    const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    if (value) return value
  } catch { /* no .env; fall through to the message below */ }
  die('No import token. Put IMPORT_TOKEN=<32+ characters> in .env (and in the server\'s environment), or pass --token.')
}

function die(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

async function send(words: unknown[], dryRun: boolean, bearer: string): Promise<Report> {
  const res = await fetch(`${url}/api/admin/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ words, dryRun }),
  })
  const body = await res.text()
  if (!res.ok) {
    const message = (() => { try { return JSON.parse(body).statusMessage ?? body } catch { return body } })()
    die(`${url} answered ${res.status}: ${message}`)
  }
  return JSON.parse(body) as Report
}

const line = (r: Report) =>
  `${r.wordsCreated} new, ${r.wordsMerged} merged, ${r.entriesCreated} entries `
  + `(${r.entriesMerged} merged, ${r.entriesLinked} linked to another word, ${r.entriesFilled} filled in), `
  + `${r.examplesCreated} examples added`
  + (r.examplesSkipped ? ` (${r.examplesSkipped} already there)` : '')

if (!files.length) die('Usage: npm run import -- <file.json…> [--commit] [--url https://lahga.fyi] [--token …]')

const bearer = await token()
const total = { words: 0, entries: 0, examples: 0, merged: 0, errors: 0 }
console.log(`\n  ${commit ? 'Importing into' : 'Checking against'} ${url}\n`)

for (const file of files) {
  let words: unknown[]
  try {
    const parsed = JSON.parse(await readFile(resolve(process.cwd(), file), 'utf8'))
    words = Array.isArray(parsed) ? parsed : parsed.words
    if (!Array.isArray(words)) throw new Error('expected { "words": [...] }')
  } catch (e) {
    die(`${file}: ${(e as Error).message}`)
  }

  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK)
    const part = words.length > CHUNK ? ` [${i + 1}–${i + chunk.length}]` : ''
    const check = await send(chunk, true, bearer)
    if (check.errors.length) {
      console.log(`  ✗ ${file}${part}: ${check.errors.length} problem(s)`)
      for (const e of check.errors.slice(0, 10)) console.log(`      #${e.index + 1} ${e.headword ?? ''}: ${e.message}`)
      if (check.errors.length > 10) console.log(`      …and ${check.errors.length - 10} more`)
      total.errors += check.errors.length
      continue // a file with errors is never saved; the rest still get checked
    }
    if (!commit) {
      console.log(`  ✓ ${file}${part}: ${chunk.length} words ready`)
      total.words += chunk.length
      continue
    }
    const saved = await send(chunk, false, bearer)
    console.log(`  ✓ ${file}${part}: ${line(saved)}`)
    total.words += saved.wordsCreated
    total.entries += saved.entriesCreated
    total.examples += saved.examplesCreated
    total.merged += saved.entriesMerged + saved.entriesLinked
    total.errors += saved.errors.length
  }
}

console.log(commit
  ? `\n  ${total.words} new words, ${total.entries} entries, ${total.examples} examples, ${total.merged} merged into what was there, ${total.errors} errors\n`
  : `\n  ${total.words} words ready, ${total.errors} errors. Add --commit to save them.\n`)
process.exit(total.errors ? 1 : 0)
