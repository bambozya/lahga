/**
 * Where the «needs checking» forms come from: the least-sure lines of
 * docs/seed/LLM-REVIEW.md and whole draft columns of seed files. Shared by
 * scripts/mark-review.ts (which marks them on the site) and
 * scripts/review-batch.ts (which asks a second model about them).
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export type Item = { headword: string, dialect: string, form: string }

/** «maghreb» in the notes means the three Maghreb columns the site has. */
const expand = (dialect: string) => dialect === 'maghreb' ? ['moroccan', 'algerian', 'tunisian'] : [dialect]

export function fromReview(text: string): Item[] {
  const out: Item[] = []
  for (const raw of text.split('\n')) {
    if (!raw.startsWith('- ') || !raw.includes(' · ')) continue
    let headword = ''
    for (const part of raw.slice(2).split(';')) {
      const bits = part.split('·').map(s => s.trim())
      if (bits.length < 3) continue
      if (bits[0]) headword = bits[0]
      if (!headword) continue
      const form = bits[2]!.replace(/\(.*$/, '').replace(/\s[—–]\s.*$/, '').trim()
      if (!form) continue
      for (const d of bits[1]!.split('/').map(s => s.trim()).filter(s => /^[a-z]+$/.test(s))) {
        for (const dialect of expand(d)) out.push({ headword, dialect, form })
      }
    }
  }
  return out
}

export async function fromSeed(spec: string): Promise<Item[]> {
  const [file, dialect] = spec.split('@') as [string, string | undefined]
  const doc: { words: { headword: string, entries: { dialect: string, form: string, review?: boolean }[] }[] } = JSON.parse(await readFile(resolve(file), 'utf8'))
  return doc.words.flatMap(w => w.entries
    .filter(e => dialect ? e.dialect === dialect : e.review)
    .map(e => ({ headword: w.headword, dialect: e.dialect, form: e.form })))
}
