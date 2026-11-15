import { arabicDigits } from './arabic'
import type { Mark } from './games'

/**
 * «هل تُقال هكذا؟» (/check) as rounds (#51): what the page and the server
 * agree on, kept here so it can be tested without either.
 *
 * The rule the whole page hangs on: nothing rewards «نعم» over «لا» or «لا
 * أعرف», and nothing rewards speed. A card counts once it has been seen,
 * whatever was said about it.
 */

/** One card of a round, once the visitor has dealt with it. */
export type Outcome = {
  /** «نعم» or «لا»; false for «لا أعرف». */
  answered: boolean
  /** This answer was the one that settled the draft. */
  confirmed: boolean
}

/**
 * The round as a row of nuqtas: green where the answer settled a draft, ink
 * for every other card seen (yes, no and «لا أعرف» alike), open for the cards
 * not reached yet.
 */
export function checkMarks(outcomes: Outcome[], size: number): Mark[] {
  return Array.from({ length: Math.max(size, outcomes.length) }, (_, i) => {
    const o = outcomes[i]
    return !o ? 'open' : o.confirmed ? 'right' : 'used'
  })
}

/** «كلمة واحدة، كلمتين، ٣ كلمات، ١١ كلمة»: the noun agrees with the number (after «عن» or as an object). */
export const wordsCount = (n: number) => n === 1 ? 'كلمة واحدة' : n === 2 ? 'كلمتين' : n <= 10 ? `${arabicDigits(n)} كلمات` : `${arabicDigits(n)} كلمة`

/** «١٬٠٣٠»: Arabic-Indic digits, thousands apart. */
export const arabicCount = (n: number) => arabicDigits(n).replace(/(?<=[٠-٩])(?=([٠-٩]{3})+$)/g, '٬')

/**
 * What a visitor sends on: what they did today in this dialect, and the link
 * that opens the same dialect for whoever speaks it. Settled words lead when
 * there are any, since that is the part that shows on the site.
 */
export function checkShareText(day: { answered: number, confirmed: number }, dialect: { slug: string, nameAr: string }): string {
  const did = day.confirmed
    ? `ثبّتُّ اليوم ${wordsCount(day.confirmed)} في ${dialect.nameAr}`
    : `أجبت اليوم عن ${wordsCount(day.answered)} في ${dialect.nameAr}`
  return `${did} على معجم لهجة. هل تتكلمها؟\nhttps://lahga.fyi/check?dialect=${dialect.slug}`
}

/** A dialect as the check page lists it. */
export type DialectProgress = {
  slug: string
  nameAr: string
  /** 0 for a main dialect, 1 for one listed under it, and so on. */
  depth: number
  /** Drafts still asked about. */
  n: number
  /** Forms a speaker stands behind (not marked as a draft). */
  checked: number
  /** All its forms. */
  total: number
}

type Row = { id: number, parentId: number | null, slug: string, nameAr: string, sortOrder: number }
type Tally = { n: number, checked: number, total: number }

/**
 * The dialects as one list, each main dialect followed by the ones under it,
 * in sort order. A dialect is listed when it has forms, or when one under it
 * does (then it is a heading: total 0). A dialect whose parent is missing is
 * listed as a main one rather than lost.
 */
export function dialectProgress(rows: Row[], tallies: Map<number, Tally>): DialectProgress[] {
  const ids = new Set(rows.map(r => r.id))
  const children = new Map<number | null, Row[]>()
  for (const r of [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
    const parent = r.parentId != null && ids.has(r.parentId) && r.parentId !== r.id ? r.parentId : null
    children.set(parent, [...(children.get(parent) ?? []), r])
  }
  const walk = (parent: number | null, depth: number, path: Set<number>): DialectProgress[] =>
    (children.get(parent) ?? []).flatMap((r) => {
      if (path.has(r.id)) return [] // a loop in the data: stop rather than spin
      const under = walk(r.id, depth + 1, new Set(path).add(r.id))
      const t = tallies.get(r.id) ?? { n: 0, checked: 0, total: 0 }
      if (!t.total && !under.length) return []
      return [{ slug: r.slug, nameAr: r.nameAr, depth, n: t.n, checked: t.checked, total: t.total }, ...under]
    })
  return walk(null, 0, new Set())
}
