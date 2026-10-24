import { wilson } from './votes'

/**
 * The order the dialect forms of a word are read in, on the word's own page and
 * on a result card alike: best-supported entry first (the Wilson lower bound
 * rewards agreement, not volume), then gathered by top-level dialect so one
 * region's forms stay together, the regions themselves strongest-first.
 *
 * A card shows the result flat and the page shows it a region at a time, but
 * they must not disagree about which form comes first.
 */
export function groupByRegion<T extends { id: number, rank: number, score: number, group: { slug: string, nameAr: string } }>(entries: T[]) {
  const sorted = [...entries].sort((a, b) => b.rank - a.rank || b.score - a.score || a.id - b.id)
  const groups: Record<string, { slug: string, nameAr: string, entries: T[] }> = {}
  for (const e of sorted) {
    groups[e.group.slug] ??= { ...e.group, entries: [] }
    groups[e.group.slug]!.entries.push(e)
  }
  return Object.values(groups).sort((a, b) => (b.entries[0]?.rank ?? 0) - (a.entries[0]?.rank ?? 0))
}

type DialectRef = { slug: string, nameAr: string }

/**
 * The group a dialect is read under: its region for a sub-dialect (قاهري is
 * read with مصري), itself for a region. The SQL side says the same thing as
 * `coalesce(parent_id, id)`.
 */
export function dialectGroup(dialect: DialectRef & { parent?: DialectRef | null }): DialectRef {
  const g = dialect.parent ?? dialect
  return { slug: g.slug, nameAr: g.nameAr }
}

type CardLink = {
  status: string
  entry: {
    id: number, form: string, score: number, upvotes: number, downvotes: number, status: string,
    dialect: DialectRef & { parent?: DialectRef | null }
  }
}

/**
 * A word's forms as a result card lists them (the search results, the
 * divergence ranking): live links to live entries only, flat, in the same
 * order the word's own page reads them in.
 */
export function cardEntries(links: CardLink[]) {
  const entries = links
    .filter(l => l.status === 'active' && l.entry.status === 'active')
    .map(l => ({
      id: l.entry.id,
      form: l.entry.form,
      score: l.entry.score,
      rank: wilson(l.entry.upvotes, l.entry.downvotes),
      dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
      group: dialectGroup(l.entry.dialect),
    }))
  return groupByRegion(entries)
    .flatMap(g => g.entries)
    .map(e => ({ id: e.id, form: e.form, dialect: e.dialect }))
}
