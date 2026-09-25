/**
 * Converts Wiktionary's Arabic-dialect sections (CC BY-SA, via kaikki.org's
 * machine-readable extracts) into a lahga seed file:
 *
 *   npm run seed:wiktionary            # needs the raw files, see below
 *   npm run seed:wiktionary -- --fetch # downloads them first (~550 MB)
 *
 * Wiktionary is dialect-centric with English glosses; lahga is MSA-centric.
 * So the conversion goes gloss → concept → headword:
 *
 * 1. Every sense of every entry in the seven dialect extracts becomes one or
 *    more «gloss atoms» ("car", "to arrive"), keyed with a coarse part of
 *    speech so that "still" the adverb and "still" the adjective stay apart.
 * 2. An atom is a concept worth a page when three or more of lahga's dialects
 *    give it three or more distinct forms — the site's own rule.
 * 3. The headword comes from the Standard Arabic extract: the lemma whose
 *    glosses carry the same atom. That pick is only trusted when it already
 *    is a lahga headword, or when it is also one of the cluster's own dialect
 *    forms (a cognate). Everything else goes to a review list, and a
 *    hand-written overrides file (`docs/seed/candidates/wiktionary-headwords.json`,
 *    `{ "<atom>|<pos>": "<headword>" | null }`) decides; null skips a concept.
 *
 * Forms are the entry's page title (no diacritics, matching the corpus); a
 * verb uses its non-past form (يكتب), lahga's convention. At most
 * MAX_IMPORTED_FORMS_PER_DIALECT forms per dialect per word (cap.ts), counting
 * hand-written ones, chosen the way cap.ts ranks them. An example sentence
 * comes along when it is Arabic-only; the English translation is dropped since
 * a gloss has to be Arabic script.
 *
 * Wiktionary groups the Levant as South (Palestinian, Jordanian) and North
 * (Syrian, Lebanese). South is filed as `palestinian` — its entries are
 * overwhelmingly sourced there — and North as the region-wide `levantine`.
 * Iraqi, Sudanese, Algerian, Libyan, Najdi, Yemeni and Hassaniya have no
 * Wiktionary section of their own and get nothing from this source.
 */
import { createReadStream } from 'node:fs'
import { readFile, writeFile, mkdir, glob, stat } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeArabic, isArabicOnly } from '../../shared/utils/arabic'
import { capImportedForms, MAX_IMPORTED_FORMS_PER_DIALECT } from './cap'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const RAW = resolve(HERE, '.wiktionary')
const OUT = resolve(ROOT, 'docs/seed/words-58-wiktionary.json')
const OVERRIDES = resolve(ROOT, 'docs/seed/candidates/wiktionary-headwords.json')
const REVIEW = resolve(ROOT, 'docs/seed/candidates/wiktionary-review.txt')
const ALL = resolve(ROOT, 'docs/seed/candidates/wiktionary-all.txt')

/** kaikki.org file → lahga dialect slug. */
const SOURCES: Record<string, string> = {
  EgyptianArabic: 'egyptian',
  MoroccanArabic: 'moroccan',
  GulfArabic: 'gulf',
  HijaziArabic: 'hejazi',
  SouthLevantineArabic: 'palestinian',
  NorthLevantineArabic: 'levantine',
  TunisianArabic: 'tunisian',
}
const MSA = 'Arabic'
const kaikkiUrl = (name: string) => {
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2')
  return `https://kaikki.org/dictionary/${encodeURIComponent(spaced)}/kaikki.org-dictionary-${name}.jsonl`
}

/** Parts of speech that can be a lahga word, and the coarse group a cluster is keyed by. */
const POS_GROUP: Record<string, string> = {
  noun: 'noun', verb: 'verb', adj: 'adj',
  adv: 'other', intj: 'other', pron: 'other', num: 'other', prep: 'other', conj: 'other', particle: 'other', det: 'other', phrase: 'other',
}
/** A sense with one of these is not a plain current word for the concept. */
const SKIP_SENSE_TAGS = new Set(['form-of', 'alt-of', 'obsolete', 'archaic', 'rare', 'dated', 'misspelling', 'abbreviation', 'initialism', 'vulgar', 'offensive', 'derogatory', 'childish', 'baby-talk'])
const MIN_DIALECTS = 3
const MIN_FORMS = 3

const DIACRITICS = /[ً-ْٰـ]/g
const strip = (s: string) => s.replace(DIACRITICS, '').trim()

type Sense = { glosses?: string[], tags?: string[], examples?: { text?: string }[] }
type Raw = { word: string, pos: string, senses: Sense[], forms?: { form: string, tags?: string[] }[] }
type Entry = { dialect: string, form: string, examples?: { text: string }[] }
type Word = { headword: string, definition?: string | null, kind?: string, entries: Entry[] }
type Cluster = { atom: string, pos: string, forms: Map<string, Entry[]> } // dialect → entries

/** "(colloquial) a car, an automobile; vehicle" → ["car", "automobile", "vehicle"] */
function atomsOf(gloss: string): string[] {
  const g = gloss.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '')
  const out: string[] = []
  for (let a of g.split(/[;,]/)) {
    a = a.trim().replace(/[.!?]+$/, '').replace(/^(a|an|the)\s+/, '').trim()
    if (a.length < 2 || a.length > 40 || a.split(/\s+/).length > 3) continue
    if (/\b(of|form|see|used|someone|something|one who|who|which|that|etc)\b/.test(a)) continue
    out.push(a)
  }
  return out
}

/** The form lahga stores: the page title, or for a verb its non-past. */
function lemmaForm(e: Raw): string | null {
  if (e.pos !== 'verb') return strip(e.word)
  const np = e.forms?.find(f => f.tags?.includes('non-past') && /[؀-ۿ]/.test(f.form))
  return np ? strip(np.form).split(/\s+/)[0]! : null
}

async function* lines(file: string) {
  const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })
  for await (const line of rl) if (line) yield JSON.parse(line) as Raw
}

async function fetchRaw() {
  await mkdir(RAW, { recursive: true })
  for (const name of [...Object.keys(SOURCES), MSA]) {
    const path = resolve(RAW, `${name}.jsonl`)
    if (await stat(path).catch(() => null)) { console.log(`  have ${name}.jsonl`); continue }
    console.log(`  downloading ${name}…`)
    const res = await fetch(kaikkiUrl(name), { headers: { 'user-agent': 'lahga.fyi seed converter' } })
    if (!res.ok) throw new Error(`${name}: ${res.status}`)
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
  }
}

async function existingWords(): Promise<Map<string, Word>> {
  const map = new Map<string, Word>()
  for await (const file of glob('docs/seed/words-*.json', { cwd: ROOT })) {
    if (file.endsWith('words-58-wiktionary.json')) continue
    const doc: { words: Word[] } = JSON.parse(await readFile(resolve(ROOT, file), 'utf8'))
    for (const w of doc.words) { const k = normalizeArabic(w.headword); if (!map.has(k)) map.set(k, w) }
  }
  return map
}

async function main() {
  if (process.argv.includes('--fetch')) await fetchRaw()

  // 1. dialect entries → clusters
  const clusters = new Map<string, Cluster>()
  let entriesRead = 0, sensesUsed = 0
  for (const [name, dialect] of Object.entries(SOURCES)) {
    for await (const e of lines(resolve(RAW, `${name}.jsonl`))) {
      const group = POS_GROUP[e.pos]
      if (!group) continue
      const form = lemmaForm(e)
      if (!form || !isArabicOnly(form)) continue
      if (/\s/.test(form) && e.pos !== 'phrase') continue
      entriesRead++
      for (const s of e.senses) {
        if (s.tags?.some(t => SKIP_SENSE_TAGS.has(t))) continue
        const example = s.examples?.map(x => strip(x.text ?? '')).find(t => /[\u0621-\u064A]{2,}/.test(t) && isArabicOnly(t) && t.length >= 4 && t.length <= 160)
        const entry: Entry = { dialect, form, ...(example ? { examples: [{ text: example }] } : {}) }
        let any = false
        for (const g of s.glosses ?? []) {
          for (const atom of atomsOf(g)) {
            any = true
            const key = `${atom}|${group}`
            let c = clusters.get(key)
            if (!c) clusters.set(key, c = { atom, pos: group, forms: new Map() })
            const list = c.forms.get(dialect) ?? []
            if (!list.some(x => normalizeArabic(x.form) === normalizeArabic(form))) list.push(entry)
            else if (example && !list.find(x => normalizeArabic(x.form) === normalizeArabic(form))!.examples) list.find(x => normalizeArabic(x.form) === normalizeArabic(form))!.examples = [{ text: example }]
            c.forms.set(dialect, list)
          }
        }
        if (any) sensesUsed++
      }
    }
  }

  // 2. the ones that earn a page
  const distinct = (c: Cluster) => new Set([...c.forms.values()].flat().map(e => normalizeArabic(e.form))).size
  const good = [...clusters.values()].filter(c => c.forms.size >= MIN_DIALECTS && distinct(c) >= MIN_FORMS)
  const wanted = new Map(good.map(c => [`${c.atom}|${c.pos}`, c]))

  // 3. MSA candidates for those atoms, from the big extract
  type Cand = { lemma: string, first: boolean, count: number }
  const cands = new Map<string, Map<string, Cand>>() // key → lemma → cand
  for await (const e of lines(resolve(RAW, `${MSA}.jsonl`))) {
    const group = POS_GROUP[e.pos]
    if (!group) continue
    const form = lemmaForm(e)
    if (!form || !isArabicOnly(form)) continue
    for (const s of e.senses) {
      if (s.tags?.some(t => SKIP_SENSE_TAGS.has(t))) continue
      const atoms = (s.glosses ?? []).flatMap(atomsOf)
      atoms.forEach((atom, i) => {
        const key = `${atom}|${group}`
        if (!wanted.has(key)) return
        let m = cands.get(key)
        if (!m) cands.set(key, m = new Map())
        const c = m.get(form) ?? { lemma: form, first: false, count: 0 }
        c.count++; if (i === 0) c.first = true
        m.set(form, c)
      })
    }
  }

  // 4. pick a headword per cluster: overrides, then a trusted automatic pick
  const existing = await existingWords()
  const overrides: Record<string, string | null> = JSON.parse(await readFile(OVERRIDES, 'utf8').catch(() => '{}'))
  const review: string[] = []
  const all: string[] = []
  const words: Word[] = []
  const byHeadword = new Map<string, { headword: string, pos: string, forms: Map<string, Entry[]> }>()
  let fromOverride = 0, trustedExisting = 0, trustedCognate = 0, skipped = 0, held = 0, capped = 0

  for (const c of good) {
    const key = `${c.atom}|${c.pos}`
    const clusterForms = new Set([...c.forms.values()].flat().map(e => normalizeArabic(e.form)))
    const ranked = [...(cands.get(key)?.values() ?? [])]
      .map(x => ({ ...x, exists: existing.has(normalizeArabic(x.lemma)), cognate: clusterForms.has(normalizeArabic(x.lemma)) }))
      .sort((a, b) => Number(b.exists) - Number(a.exists) || Number(b.cognate) - Number(a.cognate) || Number(b.first) - Number(a.first) || b.count - a.count || a.lemma.length - b.lemma.length)
    let headword: string | null | undefined
    if (key in overrides) { headword = overrides[key]; if (headword) fromOverride++; else { skipped++; continue } }
    else {
      const top = ranked[0]
      const both = ranked.filter(x => x.exists && x.cognate), exists = ranked.filter(x => x.exists), cognate = ranked.filter(x => x.cognate)
      if (both.length === 1) { headword = both[0]!.lemma; trustedExisting++ }
      else if (!both.length && exists.length === 1) { headword = exists[0]!.lemma; trustedExisting++ }
      else if (!exists.length && cognate.length === 1) { headword = cognate[0]!.lemma; trustedCognate++ }
      else {
        held++
        const alts = ranked.slice(0, 6).map(x => x.lemma + (x.exists ? '*' : '') + (x.cognate ? '~' : '')).join(' ')
        const forms = [...c.forms].map(([d, es]) => `${d}:${es.map(e => e.form).join('/')}`).join('  ')
        review.push(`${key}\t${top?.lemma ?? ''}\t${alts}\t${forms}`)
        continue
      }
    }

    const base = existing.get(normalizeArabic(headword))
    // Two glosses can land on one headword ("to rest" and "to relax"); their
    // forms are pooled per dialect first, and the cap applied once, below.
    const pool = byHeadword.get(normalizeArabic(headword)) ?? { headword, pos: c.pos, forms: new Map<string, Entry[]>() }
    for (const [dialect, imported] of c.forms) {
      const list = pool.forms.get(dialect) ?? []
      for (const e of imported) if (!list.some(x => normalizeArabic(x.form) === normalizeArabic(e.form))) list.push(e)
      pool.forms.set(dialect, list)
    }
    byHeadword.set(normalizeArabic(headword), pool)
    all.push(`${key}\t${headword}\t${key in overrides ? 'override' : 'trusted'}\t${[...c.forms].map(([d, es]) => `${d}:${es.map(e => e.form).join('/')}`).join('  ')}`)
  }

  // 5. build the words: existing entries carried along, then capped imports
  for (const { headword, pos, forms } of byHeadword.values()) {
    const base = existing.get(normalizeArabic(headword))
    const word: Word = base
      ? { headword: base.headword, ...(base.definition ? { definition: base.definition } : {}), ...(base.kind ? { kind: base.kind } : {}), entries: base.entries.map(e => ({ ...e })) }
      : { headword, ...(pos === 'other' && /\s/.test(headword) ? { kind: 'phrase' } : {}), entries: [] }
    for (const [dialect, imported] of forms) {
      const handwritten = word.entries.filter(e => e.dialect === dialect)
      const fresh = imported.filter(e => !handwritten.some(h => normalizeArabic(h.form) === normalizeArabic(e.form)))
      const { keep, drop } = capImportedForms(headword, handwritten.length, fresh)
      capped += drop.length
      word.entries.push(...keep)
    }
    if (new Set(word.entries.map(e => normalizeArabic(e.form))).size < MIN_FORMS) { skipped++; continue }
    words.push(word)
  }

  await mkdir(dirname(REVIEW), { recursive: true })
  await writeFile(OUT, JSON.stringify({ words }, null, 2) + '\n')
  await writeFile(ALL, ['# Every Wiktionary cluster that became (part of) a word: atom|pos, headword, how the headword was chosen, dialect forms.', '# To reject or redirect one, add its key to wiktionary-headwords.json.', '', ...all].join('\n') + '\n')
  await writeFile(REVIEW, [
    '# Wiktionary concept clusters whose MSA headword needs a human pick (2026-09-25).',
    '# Columns: atom|pos, automatic top pick, alternatives (* = already a lahga headword, ~ = also a dialect form here), dialect forms.',
    '# Decide in docs/seed/candidates/wiktionary-headwords.json as { "atom|pos": "headword" } or null to skip, then rerun npm run seed:wiktionary.',
    '', ...review].join('\n') + '\n')

  console.log(`\n  dialect entries read: ${entriesRead}, senses used: ${sensesUsed}, gloss clusters: ${clusters.size}`)
  console.log(`  clusters with ≥${MIN_DIALECTS} dialects and ≥${MIN_FORMS} forms: ${good.length}`)
  console.log(`  headword from overrides: ${fromOverride}, trusted (existing page): ${trustedExisting}, trusted (cognate): ${trustedCognate}`)
  console.log(`  held for review: ${held} → ${REVIEW}`)
  console.log(`  skipped (override null, or too few forms after the cap): ${skipped}; forms dropped by the ${MAX_IMPORTED_FORMS_PER_DIALECT}-per-dialect cap: ${capped}`)
  console.log(`  words written: ${words.length} → ${OUT}\n`)
}

await main()
