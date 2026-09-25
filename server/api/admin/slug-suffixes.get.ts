import { and, eq, like, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * Live words whose address carries a number — /w/أين-2 — because another row
 * already held the plain slug when they were created. That other row is
 * nearly always a retired twin: a word pruned for having too few forms
 * (scripts/check-variety.ts) keeps its row and its slug, so the same headword
 * imported again later lands one step over. This lists every such pair, with
 * what the holder still has on it, for /settings/admin/slugs to decide on:
 * merge the two (POST /api/admin/merge-words) or leave them.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const suffixed = await db.query.words.findMany({
    where: and(eq(schema.words.status, 'active'), like(schema.words.slug, '%-_%'), sql`${schema.words.slug} ~ '-[0-9]+$'`),
    with: { links: { columns: { status: true } } },
    orderBy: schema.words.headword,
  })
  const out = []
  for (const w of suffixed) {
    const base = w.slug!.replace(/-\d+$/, '')
    const holder = await db.query.words.findFirst({
      where: eq(schema.words.slug, base),
      with: { links: { columns: { status: true }, with: { entry: { columns: { status: true } } } } },
    })
    out.push({
      word: { id: w.id, headword: w.headword, slug: w.slug, entries: w.links.filter(l => l.status === 'active').length },
      base,
      holder: holder
        ? {
            id: holder.id, headword: holder.headword, slug: holder.slug, status: holder.status, definition: holder.definition,
            entries: holder.links.filter(l => l.status === 'active' && l.entry.status === 'active').length,
            retiredEntries: holder.links.filter(l => l.status !== 'active' || l.entry.status !== 'active').length,
            sameHeadword: holder.headwordNormalized === w.headwordNormalized,
          }
        : null,
    })
  }
  return out
})
