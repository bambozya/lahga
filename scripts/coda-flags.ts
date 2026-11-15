/**
 * The review pass behind the spelling house style (#46, /spelling): every form
 * on the site that breaks one of the CODA* rules shared/utils/coda.ts can
 * check, with the spelling the rule would want and why. Nothing is changed
 * here: a reviewer or a dialect expert settles each one on the site, through
 * the entry's edit form (the old spelling going into «كتابات أخرى» when
 * people really write it), and that is a revision like any other.
 *
 *   npm run coda:flags                               # from https://lahga.fyi
 *   npm run coda:flags -- --dialect gulf             # one dialect
 *   npm run coda:flags -- --url http://localhost:3000 --out /tmp/flags
 *
 * Reads the site's own export, /data/lahga.json, and writes, into .data/
 * unless --out says otherwise:
 *   coda-flags.json   one object per flagged form: entry, word, dialect, form,
 *                     rule, suggestion, evidence, the word page to fix it on
 *   coda-flags.md     the same as a list per rule and dialect, to work through
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ExportData } from '../server/utils/exportData'
import { codaFlags, CODA_RULE_LABELS, type CodaRule } from '../shared/utils/coda'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const url = (flag('url') ?? 'https://lahga.fyi').replace(/\/$/, '')
const out = resolve(flag('out') ?? '.data')
const only = flag('dialect')

function die(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const res = await fetch(`${url}/data/lahga.json`).catch(() => undefined)
if (!res?.ok) die(`${url}/data/lahga.json did not answer (${res?.status ?? 'no connection'}).`)
const data = await res.json() as ExportData
const names = new Map(data.dialects.map(d => [d.slug, d.name]))

type Row = { entry_id: number, word_id: number, headword: string, dialect: string, dialect_name: string, form: string, rule: CodaRule, suggestion: string | null, evidence: string | null, needs_review: boolean, source: string }
const rows: Row[] = []
for (const w of data.words) {
  const forms = w.entries.map(e => e.form)
  for (const e of w.entries) {
    if (only && e.dialect !== only) continue
    for (const f of codaFlags(e.form, { headword: w.headword, forms })) {
      rows.push({ entry_id: e.id, word_id: w.id, headword: w.headword, dialect: e.dialect, dialect_name: names.get(e.dialect) ?? e.dialect, form: e.form, rule: f.rule, suggestion: f.suggestion, evidence: f.evidence, needs_review: e.needs_review, source: w.source })
    }
  }
}

const byRule = new Map<CodaRule, Row[]>()
for (const r of rows) (byRule.get(r.rule) ?? byRule.set(r.rule, []).get(r.rule)!).push(r)
const total = data.words.reduce((n, w) => n + w.entries.filter(e => !only || e.dialect === only).length, 0)

const md = [
  `# Spelling flags (CODA*, /spelling)`,
  ``,
  `From ${url}/data/lahga.json as of ${data.meta.generated.slice(0, 10)}${only ? `, dialect ${only}` : ''}: ${rows.length} flags on ${new Set(rows.map(r => r.entry_id)).size} of ${total} forms.`,
  `A flag is a lead. Settle each on its word page: change the form to the house-style spelling and put the old one under «كتابات أخرى» if people write it; or leave it and note why.`,
  ``,
  ...[...byRule.entries()].flatMap(([rule, list]) => {
    const byDialect = new Map<string, Row[]>()
    for (const r of list) (byDialect.get(r.dialect_name) ?? byDialect.set(r.dialect_name, []).get(r.dialect_name)!).push(r)
    return [
      `## ${CODA_RULE_LABELS[rule]} (${list.length})`,
      ``,
      ...[...byDialect.entries()].flatMap(([dialect, items]) => [
        `### ${dialect} (${items.length})`,
        ``,
        ...items.map(r => `- ${r.form} → ${r.suggestion ?? '?'}${r.evidence ? ` (كما في «${r.evidence}»)` : ''} · ${r.headword}${r.needs_review ? ' · draft' : ''} · ${r.source}`),
        ``,
      ]),
    ]
  }),
]

await mkdir(out, { recursive: true })
await Promise.all([
  writeFile(resolve(out, 'coda-flags.json'), JSON.stringify(rows, null, 2) + '\n'),
  writeFile(resolve(out, 'coda-flags.md'), md.join('\n')),
])

console.log(`
  ${rows.length} flags on ${new Set(rows.map(r => r.entry_id)).size} of ${total} forms${only ? ` (${only})` : ''}:
${[...byRule.entries()].map(([rule, list]) => `    ${String(list.length).padStart(6)}  ${CODA_RULE_LABELS[rule]}`).join('\n')}

  ${resolve(out, 'coda-flags.md')}
  ${resolve(out, 'coda-flags.json')}
`)
