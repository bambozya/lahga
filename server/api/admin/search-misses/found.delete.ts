import { and, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * Drops every search miss that a search would now answer: the word has been
 * added since, as a headword or as a dialect form. "Would now answer" is the
 * search's own rule (server/api/words/index.get.ts): the normalised term found
 * anywhere inside an active headword, or inside an active form actively linked
 * to an active word. Works on the whole table, not only the rows the page shows.
 * A term someone reported (POST /api/search-misses) stays: they saw what the
 * search found and said it was not their word, so «found» does not settle it.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const db = await useDb()
  const m = schema.searchMisses
  const w = schema.words
  const en = schema.entries
  const l = schema.wordEntryLinks

  // The term as a LIKE pattern, its own % and _ escaped so they match themselves.
  const pattern = sql`'%' || replace(replace(replace(${m.termNormalized}, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'`
  const found = sql`exists (
      select 1 from ${w} where ${w.status} = 'active' and ${w.headwordNormalized} ilike ${pattern}
    ) or exists (
      select 1 from ${en}
      join ${l} on ${l.entryId} = ${en.id}
      join ${w} on ${w.id} = ${l.wordId}
      where ${en.status} = 'active' and ${l.status} = 'active' and ${w.status} = 'active'
        and ${en.formNormalized} ilike ${pattern}
    )`

  const rows = await db.transaction(async (tx) => {
    const rows = await tx.delete(m).where(and(eq(m.reports, 0), found)).returning({ id: m.id, term: m.term })
    for (const row of rows) await logModeration(tx, admin.id, 'delete_search_miss', 'search_miss', row.id, row.term.slice(0, 300))
    return rows
  })
  return { deleted: rows.length }
})
