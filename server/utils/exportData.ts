import { eq } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { dialectTag } from '../../shared/utils/dialectTags'

/**
 * The whole public dictionary as one plain object (docs/DISCOVERY.md): what
 * /data/lahga.json and /data/entries.csv serve, and what a dataset card on
 * Hugging Face or GitHub is built from. Active rows only; no accounts, votes
 * or revision history. Every word carries its own URL as `source`, so a row
 * copied out of the file still says where it came from.
 *
 * Built once and kept in memory for an hour, or until content changes
 * (server/plugins/page-cache-purge.ts calls invalidateExport). At the site's
 * size the build is one relational query; the memo is there so a crawler
 * fetching the file every few minutes does not repeat it.
 */
export interface ExportDialect { id: number, slug: string, name: string, language: string, parent: string | null, description: string | null, url: string }
export interface ExportExample { id: number, text: string, gloss: string | null }
export interface ExportEntry { id: number, form: string, dialect: string, language: string, meaning: string | null, notes: string | null, examples: ExportExample[] }
export interface ExportWord { id: number, slug: string, headword: string, kind: 'word' | 'phrase' | 'proverb', definition: string | null, source: string, updated: string, entries: ExportEntry[] }
export interface ExportData {
  meta: {
    name: string, url: string, description: string, license: string, attribution: string,
    generated: string, words: number, entries: number, examples: number, dialects: number,
  }
  dialects: ExportDialect[]
  words: ExportWord[]
}

const MAX_AGE_MS = 60 * 60_000
let memo: { at: number, data: ExportData } | undefined

export function invalidateExport() { memo = undefined }

export async function loadExport(): Promise<ExportData> {
  if (memo && Date.now() - memo.at < MAX_AGE_MS) return memo.data
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const db = await useDb()

  const [dialectRows, wordRows] = await Promise.all([
    db.query.dialects.findMany({ where: eq(schema.dialects.active, 1), with: { parent: true }, orderBy: schema.dialects.sortOrder }),
    db.query.words.findMany({
      where: eq(schema.words.status, 'active'),
      orderBy: schema.words.id,
      with: { links: { with: { entry: { with: { dialect: true, examples: true } } } } },
    }),
  ])

  const dialects: ExportDialect[] = dialectRows.map(d => ({
    id: d.id, slug: d.slug, name: d.nameAr, language: dialectTag(d.slug),
    parent: d.parent?.slug ?? null, description: d.descriptionAr, url: `${site}/d/${d.slug}`,
  }))

  let entryCount = 0
  let exampleCount = 0
  const words: ExportWord[] = wordRows.map((w) => {
    const entries: ExportEntry[] = w.links
      .filter(l => l.status === 'active' && l.entry.status === 'active')
      .map(l => l.entry)
      .map((e) => {
        const examples = e.examples.filter(x => x.status === 'active').map(x => ({ id: x.id, text: x.text, gloss: x.gloss }))
        exampleCount += examples.length
        return { id: e.id, form: e.form, dialect: e.dialect.slug, language: dialectTag(e.dialect.slug), meaning: e.meaning, notes: e.notes, examples }
      })
    entryCount += entries.length
    return {
      id: w.id, slug: w.slug ?? String(w.id), headword: w.headword, kind: w.kind, definition: w.definition,
      source: `${site}/w/${encodeURIComponent(w.slug ?? String(w.id))}`,
      updated: (w.updatedAt ?? w.createdAt).toISOString().slice(0, 10),
      entries,
    }
  })

  const data: ExportData = {
    meta: {
      name: 'لهجة: معجم اللهجات العربية',
      url: site,
      description: 'كلمات وعبارات وأمثال من اللهجات العربية، كل منها مربوط بمعناه بالفصحى ومنسوب إلى لهجته.',
      license: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: `لهجة، معجم اللهجات العربية (${site})، برخصة CC BY-SA 4.0`,
      generated: new Date().toISOString(),
      words: words.length, entries: entryCount, examples: exampleCount, dialects: dialects.length,
    },
    dialects,
    words,
  }
  memo = { at: Date.now(), data }
  return data
}

/** One row per dialect form, the shape a spreadsheet or a training set wants. */
export function entriesCsv(data: ExportData): string {
  const names = new Map(data.dialects.map(d => [d.slug, d.name]))
  const cell = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['headword', 'kind', 'definition', 'form', 'dialect', 'dialect_name', 'language', 'meaning', 'notes', 'entry_id', 'word_id', 'source', 'license']
  const lines = [header.join(',')]
  for (const w of data.words) {
    for (const e of w.entries) {
      lines.push([w.headword, w.kind, w.definition, e.form, e.dialect, names.get(e.dialect) ?? '', e.language, e.meaning, e.notes, e.id, w.id, w.source, 'CC BY-SA 4.0'].map(cell).join(','))
    }
  }
  // A byte-order mark, so a spreadsheet opened by double-click reads the Arabic.
  return '﻿' + lines.join('\r\n') + '\r\n'
}
