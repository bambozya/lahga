import { and, eq, inArray, sql } from 'drizzle-orm'
import { useDb, schema } from '../db'

/**
 * The words the dialects disagree about most (docs/REACH.md, Phase R4).
 *
 * The score is the one the plan names: how many distinct forms the word has
 * across dialect *groups*, over how many groups say it at all. A word every
 * region says differently scores 1; a word everyone says the same way scores
 * 1/n. Forms are compared normalised, so a stray hamza or tashkeel does not
 * invent disagreement that is not there.
 *
 * Counting by group rather than by dialect is what keeps the ranking honest:
 * eight Gulf sub-dialects saying the same word are one way of saying it, not
 * eight, and without that they would drown out a word that genuinely splits
 * the map.
 *
 * MIN_GROUPS keeps the top of the list meaningful — with two groups, any
 * disagreement at all scores a perfect 1, which would fill the page with
 * thinly-attested words rather than the interesting ones.
 */
export const MIN_GROUPS = 4

export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  const max = limitParam(limit, 50, 100)
  const db = await useDb()

  type Ranked = { wordId: number, forms: number, groups: number, score: number }
  // postgres-js returns the rows directly; PGlite wraps them in { rows }. The
  // handle is typed as the Postgres one (see server/db/index.ts), so both
  // shapes have to be accepted here.
  const result: any = await db.execute(sql`
    with group_forms as (
      select
        ${schema.wordEntryLinks.wordId} as word_id,
        coalesce(${schema.dialects.parentId}, ${schema.dialects.id}) as group_id,
        ${schema.entries.formNormalized} as form_normalized
      from ${schema.wordEntryLinks}
      join ${schema.entries} on ${schema.entries.id} = ${schema.wordEntryLinks.entryId}
      join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
      join ${schema.words} on ${schema.words.id} = ${schema.wordEntryLinks.wordId}
      where ${schema.wordEntryLinks.status} = 'active'
        and ${schema.entries.status} = 'active'
        and ${schema.words.status} = 'active'
    )
    select
      word_id as "wordId",
      count(distinct form_normalized)::int as forms,
      count(distinct group_id)::int as groups,
      (count(distinct form_normalized)::float / count(distinct group_id)) as score
    from group_forms
    group by word_id
    having count(distinct group_id) >= ${MIN_GROUPS}
    order by score desc, count(distinct group_id) desc, count(distinct form_normalized) desc, word_id
    limit ${max}
  `)
  const ranked: Ranked[] = (Array.isArray(result) ? result : result?.rows ?? []).map((r: any) => ({
    wordId: Number(r.wordId ?? r.wordid ?? r.word_id),
    forms: Number(r.forms),
    groups: Number(r.groups),
    score: Number(r.score),
  }))

  if (!ranked.length) return []
  const order = new Map(ranked.map((r, i) => [r.wordId, i]))

  const rows = await db.query.words.findMany({
    where: inArray(schema.words.id, ranked.map(r => r.wordId)),
    with: { links: { with: { entry: { with: { dialect: { with: { parent: true } } } } } } },
  })

  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((w) => {
      const stat = ranked[order.get(w.id)!]!
      return {
        id: w.id,
        slug: w.slug,
        headword: w.headword,
        definition: w.definition,
        forms: stat.forms,
        groups: stat.groups,
        score: Number(stat.score.toFixed(3)),
        // The same entry shape /api/words returns, so the page can render these
        // through the ordinary WordCard instead of a second kind of result.
        entries: cardEntries(w.links),
      }
    })
})

/** The dialect forms a result card shows, in the word page's own order — the same as /api/words. */
function cardEntries(links: any[]) {
  const entries = links
    .filter(l => l.status === 'active' && l.entry.status === 'active')
    .map(l => ({
      id: l.entry.id as number,
      form: l.entry.form as string,
      score: l.entry.score as number,
      rank: wilson(l.entry.upvotes, l.entry.downvotes),
      dialect: { slug: l.entry.dialect.slug as string, nameAr: l.entry.dialect.nameAr as string },
      group: l.entry.dialect.parent
        ? { slug: l.entry.dialect.parent.slug as string, nameAr: l.entry.dialect.parent.nameAr as string }
        : { slug: l.entry.dialect.slug as string, nameAr: l.entry.dialect.nameAr as string },
    }))
  return groupByRegion(entries)
    .flatMap(g => g.entries)
    .map(e => ({ id: e.id, form: e.form, dialect: e.dialect }))
}
