/**
 * Would a seed file's headwords merge into words already on the site?
 *
 *   npm run check-collisions -- docs/seed/words-55-*.json
 *   npm run check-collisions -- docs/seed/words-*.json --url https://lahga.fyi
 *
 * The importer matches headwords after normalizeArabic(): diacritics gone,
 * hamza forms folded, ة read as ه. So «يُخرج» (take out) is the same word as
 * «يخرج» (go out) to it, and silently merges in (it happened, 2026-09-25).
 * This asks the site's search for each headword and reports every live word
 * whose normalized headword is identical to ours:
 *
 *   - spelt the same       → an intended merge (new forms on an existing page)
 *   - spelt differently    → a collision; rename the headword before importing
 *
 * Exit code 1 on any collision, so it can gate an import like check-variety.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeArabic } from '../shared/utils/arabic'

type Word = { headword: string }

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const url = (flag('url') ?? 'http://localhost:3000').replace(/\/$/, '')
const files = args.filter(a => a.endsWith('.json'))
if (!files.length) {
  console.error('\n  Usage: npm run check-collisions -- <seed-file.json…> [--url https://lahga.fyi]\n')
  process.exit(1)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * One lookup. The site allows 90 searches a minute per IP
 * (server/utils/validate.ts), and a batch of 45 headwords plus whatever else
 * is going on can cross that, so a 429 waits and tries again rather than
 * being skipped: a skipped lookup is a collision nobody saw.
 */
async function lookup(headword: string): Promise<{ headword: string, slug: string }[] | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${url}/api/words?q=${encodeURIComponent(headword)}&limit=10`)
    if (res.ok) return await res.json()
    if (res.status !== 429) { console.error(`  ! ${headword}: ${res.status} from the site`); return null }
    await sleep(15_000)
  }
  console.error(`  ! ${headword}: still rate-limited after six tries`)
  return null
}

let collisions = 0, merges = 0, total = 0, failed = 0
console.log(`\n  Checking headwords against ${url}\n`)
for (const file of files) {
  const doc: { words: Word[] } = JSON.parse(await readFile(resolve(file), 'utf8'))
  for (const w of doc.words) {
    total++
    const wanted = normalizeArabic(w.headword)
    const live = await lookup(w.headword)
    if (!live) { failed++; continue }
    await sleep(700) // stay under the site's own limit
    for (const l of live) {
      if (normalizeArabic(l.headword) !== wanted) continue
      if (l.headword === w.headword) { merges++; console.log(`  = ${w.headword}  exists (/w/${l.slug}) — will merge`) }
      else { collisions++; console.log(`  ✗ ${w.headword}  would merge into «${l.headword}» (/w/${l.slug}) — rename it`) }
    }
  }
}
console.log(`\n  ${total} headwords: ${collisions} collision${collisions === 1 ? '' : 's'}, ${merges} intended merge${merges === 1 ? '' : 's'}${failed ? `, ${failed} not checked` : ''}\n`)
process.exit(collisions || failed ? 1 : 0)
