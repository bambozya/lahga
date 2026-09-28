/**
 * Turns a language-model draft (ChatGPT, Claude, anyone) into a seed file,
 * and refuses what breaks the content rules before a human even reads it.
 *
 *   npm run seed:draft -- docs/seed/drafts/chatgpt-01.txt
 *   npm run seed:draft -- docs/seed/drafts/*.txt --source ChatGPT --review-all
 *
 * The draft is one word per line (docs/seed/chatgpt/BRIEF.md explains it to the model):
 *
 *   ## words-97-chatgpt-kitchen                 ← starts an output file
 *   headword | definition | eg=form; lv=form/form2; ma=form? …
 *   !phrase headword | definition | eg=…         ← a leading ! makes it a phrase
 *
 *   code=form     a dialect code (eg, lv, gf, iq, ma …) or a slug from /api/dialects
 *   form/form2    at most two forms for one dialect
 *   form?         the drafter is unsure: the entry gets `"review": true`, so the
 *                 import puts it on the staff review list (word_entry_links.needs_review)
 *
 * A line is dropped, and said why, when
 *   - its headword is already on the site, retired (docs/seed/retired) or in
 *     another seed file — matched the way the importer matches (normalizeArabic);
 *   - it has fewer than three genuinely different forms (the check-variety rule:
 *     the definite article and ة/ه, و/ه at the end do not count as different);
 *   - any field holds a Latin letter, or a dialect code is unknown.
 *
 * It also lists forms that exist in the same dialect under another word with a
 * meaning or examples: the importer shares such an entry between both words, so
 * those examples would show on the new page too. Read that list and drop the
 * forms whose meaning differs (Gulf «يدّة» is a handle and a grandmother).
 *
 * Writes docs/seed/<name>.json for each ## section, and the unsure forms as
 * lines for docs/seed/LLM-REVIEW.md (printed; --review-log FILE appends them).
 * Then run the usual gates: check-variety, check-collisions, import dry run.
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { readdirSync } from 'node:fs'
import { isArabicOnly, normalizeArabic } from '../shared/utils/arabic'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const url = (flag('url') ?? 'https://lahga.fyi').replace(/\/$/, '')
const source = flag('source') ?? 'language model'
const reviewAll = args.includes('--review-all')
const reviewLog = flag('review-log')
const files = args.filter((a, i) => a.endsWith('.txt') && !['--review-log'].includes(args[i - 1] ?? ''))
if (!files.length) {
  console.error('\n  Usage: npm run seed:draft -- <draft.txt…> [--source ChatGPT] [--review-all] [--review-log docs/seed/LLM-REVIEW.md] [--url https://lahga.fyi]\n')
  process.exit(1)
}

/** Short codes a draft may use instead of slugs. */
const CODES: Record<string, string> = {
  eg: 'egyptian', lv: 'levantine', sy: 'syrian', lb: 'lebanese', pl: 'palestinian', jo: 'jordanian',
  gf: 'gulf', kw: 'kuwaiti', nj: 'najdi', hj: 'hejazi', ye: 'yemeni', iq: 'iraqi', sd: 'sudanese',
  mg: 'maghrebi', ma: 'moroccan', dz: 'algerian', tn: 'tunisian', ly: 'libyan', hs: 'hassaniya',
}

/** The check-variety key: الفار and فار, يرحمه and يرحمو are one form. */
const varietyKey = (form: string) => normalizeArabic(form).replace(/^(ال|لل)/, '').replace(/[وه]$/, 'ه').replace(/\s+/g, ' ')
/** The importer's key, plus trailing punctuation a question headword carries. */
const key = (s: string) => normalizeArabic(s).replace(/[؟?!.،]/g, '').trim()
/** Looser: ال off every word, so «أسطوانة الغاز» meets «أسطوانة غاز». */
const looseKey = (s: string) => key(s).split(' ').map(w => w.replace(/^(ال|لل)(?=..)/, '')).join(' ')

type Entry = { dialect: string, form: string, review?: true }
type Word = { headword: string, definition: string, kind?: 'phrase', entries: Entry[] }
type Live = { dialects: { slug: string }[], words: { headword: string, entries: { dialect: string, form: string, meaning: string | null, examples: unknown[] }[] }[] }

// ---------- what is already taken ----------

const live: Live = await fetch(`${url}/data/lahga.json`).then((r) => {
  if (!r.ok) throw new Error(`${url}/data/lahga.json answered ${r.status}`)
  return r.json() as Promise<Live>
})
const slugs = new Set(live.dialects.map(d => d.slug))
const taken = new Map<string, string>()
for (const w of live.words) taken.set(key(w.headword), 'on the site')
const seedDir = resolve('docs/seed')
// The files this run writes, so a second run does not find its own output taken.
const ownOutput = new Set<string>()
for (const file of files) for (const l of (await readFile(resolve(file), 'utf8')).split('\n')) if (l.trim().startsWith('## ')) ownOutput.add(`${l.trim().slice(3).trim()}.json`)
for (const dir of ['retired', '.']) {
  let names: string[] = []
  try { names = readdirSync(resolve(seedDir, dir)).filter(n => n.endsWith('.json') && (dir === 'retired' || (n.startsWith('words-') && !ownOutput.has(n)))) }
  catch { continue }
  for (const n of names) {
    const doc: { words: { headword: string }[] } = JSON.parse(await readFile(resolve(seedDir, dir, n), 'utf8'))
    for (const w of doc.words) if (!taken.has(key(w.headword))) taken.set(key(w.headword), dir === 'retired' ? 'retired' : n)
  }
}
// The same, loosely: a draft that differs from a live page only by ال is that page.
const takenLoose = new Map([...taken].map(([k, why]) => [looseKey(k), why]))
// Live single-word headwords, to notice a draft that is one of them plus a
// qualifier (غلاية → غلاية كهربائية): often the same thing, sometimes not.
const liveSingles = new Set(live.words.map(w => looseKey(w.headword)).filter(k => !k.includes(' ')))
// Forms that carry a meaning or examples under another word (see the header).
const richForms = new Map<string, string[]>()
for (const w of live.words) for (const e of w.entries) {
  if (!e.meaning && !e.examples.length) continue
  const k = `${e.dialect}\u0000${key(e.form)}`
  richForms.set(k, [...(richForms.get(k) ?? []), w.headword])
}

// ---------- read the drafts ----------

const out = new Map<string, Word[]>()
const unsure = new Map<string, string[]>()
const dropped: string[] = []
const links: string[] = []
const builtOn: string[] = []
const seen = new Set<string>()
let current = ''

for (const file of files) {
  const lines = (await readFile(resolve(file), 'utf8')).split('\n')
  lines.forEach((raw, i) => {
    const line = raw.trim()
    const where = `${basename(file)}:${i + 1}`
    if (line.startsWith('## ')) { current = line.slice(3).trim(); if (!out.has(current)) { out.set(current, []); unsure.set(current, []) } return }
    if (!line || line.startsWith('#')) return
    if (!current) { dropped.push(`${where}  no «## file-name» line before it`); return }
    const parts = line.split('|').map(s => s.trim())
    if (parts.length !== 3) { dropped.push(`${where}  needs exactly three parts separated by «|»`); return }
    let [headword, definition, forms] = parts as [string, string, string]
    const phrase = headword.startsWith('!')
    if (phrase) headword = headword.slice(1).trim()
    const k = key(headword)
    if (taken.has(k)) { dropped.push(`${where}  ${headword}: already taken (${taken.get(k)})`); return }
    if (takenLoose.has(looseKey(headword))) { dropped.push(`${where}  ${headword}: already taken, spelt with or without ال (${takenLoose.get(looseKey(headword))})`); return }
    const base = looseKey(headword).split(' ').find(w => liveSingles.has(w))
    if (base && looseKey(headword).includes(' ')) builtOn.push(`${headword}  →  built on «${base}», which has a page: keep only if it is a different thing`)
    if (seen.has(k)) { dropped.push(`${where}  ${headword}: twice in this draft`); return }
    if (!isArabicOnly(headword) || !isArabicOnly(definition)) { dropped.push(`${where}  ${headword}: Latin letters in the headword or definition`); return }

    const entries: Entry[] = []
    const shaky: string[] = []
    let bad = ''
    for (const item of forms.split(';').map(s => s.trim()).filter(Boolean)) {
      const [code, value = ''] = item.split('=').map(s => s.trim()) as [string, string?]
      const dialect = CODES[code] ?? (slugs.has(code) ? code : '')
      if (!dialect) { bad = `unknown dialect «${code}»`; break }
      const list = value.split('/').map(s => s.trim()).filter(Boolean)
      if (list.length > 2) { bad = `more than two forms for ${dialect}`; break }
      for (let f of list) {
        const doubt = f.endsWith('?')
        if (doubt) f = f.slice(0, -1).trim()
        if (!isArabicOnly(f)) { bad = `Latin letters in «${f}»`; break }
        entries.push(doubt || reviewAll ? { dialect, form: f, review: true } : { dialect, form: f })
        if (doubt) shaky.push(`${dialect} · ${f}`)
        for (const other of richForms.get(`${dialect}\u0000${key(f)}`) ?? []) {
          if (key(other) !== k) links.push(`${headword} · ${dialect} · ${f}  →  also on «${other}»`)
        }
      }
      if (bad) break
    }
    if (bad) { dropped.push(`${where}  ${headword}: ${bad}`); return }
    const distinct = new Set(entries.map(e => varietyKey(e.form)))
    if (distinct.size < 3) { dropped.push(`${where}  ${headword}: only ${distinct.size} different form(s): ${[...distinct].join(' / ')}`); return }

    seen.add(k)
    out.get(current)!.push({ headword, definition, ...(phrase ? { kind: 'phrase' as const } : {}), entries })
    if (shaky.length) unsure.get(current)!.push(`- ${headword} · ${shaky.join(' ; · ')}`)
  })
}

// ---------- write ----------

let words = 0, forms = 0
const review: string[] = []
for (const [name, list] of out) {
  if (!list.length) continue
  const file = resolve(seedDir, `${name}.json`)
  await writeFile(file, JSON.stringify({ words: list }, null, 1) + '\n')
  const n = list.reduce((s, w) => s + w.entries.length, 0)
  words += list.length; forms += n
  console.log(`  ✓ docs/seed/${name}.json: ${list.length} words, ${n} forms, ${unsure.get(name)!.length} with an unsure form`)
  if (unsure.get(name)!.length) review.push(`\n## ${name} (${source}, ${new Date().toISOString().slice(0, 10)})\n${unsure.get(name)!.join('\n')}`)
}
console.log(`\n  ${words} words, ${forms} forms ready; ${dropped.length} lines dropped${reviewAll ? '; every form marked for review' : ''}`)
if (dropped.length) console.log(`\n  Dropped:\n${dropped.map(d => `    ${d}`).join('\n')}`)
if (builtOn.length) console.log(`\n  Built on a word that already has a page — read these first:\n${builtOn.map(l => `    ${l}`).join('\n')}`)
if (links.length) console.log(`\n  Would share an entry that already has a meaning or examples — drop the ones whose meaning differs:\n${links.map(l => `    ${l}`).join('\n')}`)
if (review.length) {
  if (reviewLog) { await appendFile(resolve(reviewLog), review.join('\n') + '\n'); console.log(`\n  Unsure forms appended to ${reviewLog}`) }
  else console.log(`\n  Unsure forms (for docs/seed/LLM-REVIEW.md, or pass --review-log):${review.join('\n')}`)
}
console.log('\n  Next: npm run check-variety, npm run check-collisions -- --url https://lahga.fyi, npm run import (dry run).\n')
