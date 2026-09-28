/**
 * A second opinion on the forms marked «needs checking»: cut them into small
 * batches for another language model (ChatGPT, docs/seed/chatgpt/REVIEWER.md),
 * then read its answers back into one report.
 *
 *   npm run review:batch -- export --dialect moroccan [--size 40]
 *   npm run review:batch -- import docs/seed/review/batch-moroccan-01.answers.txt
 *
 * export  takes the drafts (the least-sure lines of LLM-REVIEW.md and the whole
 *         Najdi/Libyan/Yemeni draft columns, the same list mark-review marked),
 *         keeps the ones still on the site and not yet asked about, and writes
 *         docs/seed/review/batch-<dialect>-NN.txt: numbered lines
 *         «N | headword | definition | form» for the model to answer.
 * import  reads the model's answer file, «N | ok», «N | wrong | better form | why»
 *         or «N | unsure | why», stores every verdict in
 *         docs/seed/review/verdicts.json, and rewrites docs/seed/review/REPORT.md:
 *         per dialect, the forms it called wrong first (with its suggestion),
 *         then the ones it was unsure of.
 *
 * Nothing here touches the site. A verdict is a lead, not a confirmation: the
 * two models learned from similar text and share blind spots. What it calls
 * wrong goes to a speaker first (or is deleted by the maintainer); what it
 * calls fine stays marked until people confirm it.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { isArabicOnly, normalizeArabic } from '../shared/utils/arabic'
import { fromReview, fromSeed, type Item } from './lib/review-items'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const command = args[0]
const dir = resolve('docs/seed/review')
const verdictsFile = resolve(dir, 'verdicts.json')

type Verdict = { verdict: 'ok' | 'wrong' | 'unsure', better?: string, why?: string, batch: string, at: string }
type Verdicts = Record<string, Item & Verdict>
const id = (i: Item) => `${i.dialect}\u0000${normalizeArabic(i.headword)}\u0000${normalizeArabic(i.form)}`

function die(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const loadVerdicts = async (): Promise<Verdicts> => existsSync(verdictsFile) ? JSON.parse(await readFile(verdictsFile, 'utf8')) : {}

/** A batch file's numbered items: «N | headword | definition | form». */
function parseBatch(text: string) {
  const dialect = text.match(/^# dialect: ([a-z-]+)/m)?.[1]
  if (!dialect) die('The batch file has no «# dialect:» line.')
  const items = new Map<number, Item>()
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d+) \| (.+?) \| .*? \| (.+)$/)
    if (m) items.set(Number(m[1]), { headword: m[2]!.trim(), dialect, form: m[3]!.trim() })
  }
  return { dialect, items }
}

async function exportBatch() {
  const dialect = flag('dialect') ?? die('Which dialect? --dialect moroccan')
  const size = Number(flag('size') ?? 40)
  const live: { words: { headword: string, definition: string | null, entries: { dialect: string, form: string }[] }[] } = await fetch('https://lahga.fyi/data/lahga.json').then(r => r.json())
  const words = new Map(live.words.map(w => [normalizeArabic(w.headword), w]))

  const candidates: Item[] = [
    ...fromReview(await readFile(resolve('docs/seed/LLM-REVIEW.md'), 'utf8')),
    ...await fromSeed('docs/seed/words-73-llm-najdi.json@najdi'),
    ...await fromSeed('docs/seed/words-74-llm-libyan.json@libyan'),
    ...await fromSeed('docs/seed/words-75-llm-yemeni.json@yemeni'),
  ].filter(i => i.dialect === dialect)

  // Already answered, or already sent out in a batch still waiting for its answer.
  const done = new Set(Object.keys(await loadVerdicts()))
  await mkdir(dir, { recursive: true })
  const batches = readdirSync(dir).filter(n => n.startsWith(`batch-${dialect}-`) && n.endsWith('.txt') && !n.endsWith('.answers.txt'))
  for (const n of batches) for (const i of parseBatch(await readFile(resolve(dir, n), 'utf8')).items.values()) done.add(id(i))

  const picked: (Item & { definition: string })[] = []
  const seen = new Set<string>()
  for (const i of candidates) {
    if (picked.length >= size) break
    const k = id(i)
    if (done.has(k) || seen.has(k)) continue
    const w = words.get(normalizeArabic(i.headword))
    // Only forms still on the site: corrected or removed ones need no opinion.
    if (!w || !w.entries.some(e => e.dialect === dialect && normalizeArabic(e.form) === normalizeArabic(i.form))) continue
    seen.add(k)
    picked.push({ ...i, definition: w.definition ?? '' })
  }
  if (!picked.length) die(`Nothing left to ask about for ${dialect}.`)

  const n = String(batches.length + 1).padStart(2, '0')
  const file = resolve(dir, `batch-${dialect}-${n}.txt`)
  const lines = picked.map((p, i) => `${i + 1} | ${p.headword} | ${p.definition} | ${p.form}`)
  await writeFile(file, `# dialect: ${dialect}\n# Answer each line as «N | ok», «N | wrong | better form | why» or «N | unsure | why».\n${lines.join('\n')}\n`)
  console.log(`\n  ✓ ${basename(file)}: ${picked.length} ${dialect} forms. Paste it to ChatGPT, save its answer as ${basename(file).replace('.txt', '.answers.txt')}\n`)
}

async function importAnswers() {
  const answers = args[1] ?? die('Which answer file? npm run review:batch -- import docs/seed/review/batch-moroccan-01.answers.txt')
  const batchFile = resolve(answers).replace(/\.answers\.txt$/, '.txt')
  if (!existsSync(batchFile)) die(`No batch file ${basename(batchFile)} next to the answers.`)
  const { items } = parseBatch(await readFile(batchFile, 'utf8'))
  const verdicts = await loadVerdicts()
  const batch = basename(batchFile, '.txt')
  const at = new Date().toISOString().slice(0, 10)
  const problems: string[] = []
  let counted = 0

  for (const line of (await readFile(resolve(answers), 'utf8')).split('\n')) {
    const parts = line.replace(/^`+|`+$/g, '').split('|').map(s => s.trim())
    if (!/^\d+$/.test(parts[0] ?? '')) continue
    const item = items.get(Number(parts[0]))
    if (!item) { problems.push(`line ${parts[0]} is not in the batch`); continue }
    const word = (parts[1] ?? '').toLowerCase()
    const verdict = word === 'ok' || word === 'wrong' || word === 'unsure' ? word : null
    if (!verdict) { problems.push(`line ${parts[0]}: «${parts[1]}» is not ok / wrong / unsure`); continue }
    const better = verdict === 'wrong' && parts[2] && parts[2] !== '-' && isArabicOnly(parts[2]) ? parts[2] : undefined
    const why = (verdict === 'wrong' ? parts[3] : parts[2]) || undefined
    verdicts[id(item)] = { ...item, verdict, ...(better ? { better } : {}), ...(why ? { why } : {}), batch, at }
    counted++
  }
  const missing = [...items.keys()].filter(k => !verdicts[id(items.get(k)!)])
  await writeFile(verdictsFile, JSON.stringify(verdicts, null, 1) + '\n')
  await writeReport(verdicts)
  console.log(`\n  ✓ ${counted} verdicts from ${basename(answers)} stored; REPORT.md rewritten`)
  if (missing.length) console.log(`  ${missing.length} lines of the batch have no answer: ${missing.join(', ')}`)
  for (const p of problems) console.log(`  ? ${p}`)
  console.log()
}

async function writeReport(verdicts: Verdicts) {
  const all = Object.values(verdicts)
  const dialects = [...new Set(all.map(v => v.dialect))].sort()
  const out = [
    '# Second opinions on draft forms',
    '',
    'Written by `npm run review:batch -- import`. A verdict here is another model\'s',
    'opinion, not a confirmation: «wrong» means ask a speaker or delete the form,',
    '«ok» changes nothing (the form stays marked until people confirm it).',
  ]
  for (const d of dialects) {
    const mine = all.filter(v => v.dialect === d)
    const wrong = mine.filter(v => v.verdict === 'wrong')
    const unsure = mine.filter(v => v.verdict === 'unsure')
    out.push('', `## ${d}: ${mine.length} asked, ${wrong.length} wrong, ${unsure.length} unsure, ${mine.length - wrong.length - unsure.length} ok`)
    if (wrong.length) out.push('', '### Called wrong', ...wrong.map(v => `- ${v.headword} · ${v.form}${v.better ? ` → ${v.better}` : ''}${v.why ? ` (${v.why})` : ''}`))
    if (unsure.length) out.push('', '### Unsure', ...unsure.map(v => `- ${v.headword} · ${v.form}${v.why ? ` (${v.why})` : ''}`))
  }
  await writeFile(resolve(dir, 'REPORT.md'), out.join('\n') + '\n')
}

if (command === 'export') await exportBatch()
else if (command === 'import') await importAnswers()
else die('Usage: npm run review:batch -- export --dialect <slug> [--size 40] | import <batch-…answers.txt>')
