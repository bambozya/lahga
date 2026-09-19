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
