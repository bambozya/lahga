import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The two ways a live word's address can drift from its headword, for
 * /settings/admin/slugs:
 *
 * - `suffixed`: the slug carries a number — /w/أين-2 — because another row
 *   already held the plain slug when the word was created. That other row is
 *   nearly always a retired twin: a word pruned for having too few forms
 *   (scripts/check-variety.ts) keeps its row and its slug, so the same
 *   headword imported again later lands one step over. Each pair comes with
 *   what the holder still has on it, to merge (POST /api/admin/merge-words)
 *   or leave.
 * - `mismatched`: the slug is not what the headword would give today, because
 *   the headword was edited after creation and a slug is never regenerated
 *   (server/utils/slug.ts). To reset: POST /api/admin/reset-slug.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const live = await db.query.words.findMany({
    where: eq(schema.words.status, 'active'),
    columns: { id: true, headword: true, headwordNormalized: true, slug: true },
    with: { links: { columns: { status: true } } },
    orderBy: schema.words.headword,
  })
  const mismatched = live
    .filter(w => w.slug && slugDrift(w.slug, w.headword).mismatched)
    .map(w => ({ id: w.id, headword: w.headword, slug: w.slug, expected: expectedSlug(w.headword), entries: w.links.filter(l => l.status === 'active').length }))

  const suffixed = []
  for (const w of live.filter(w => w.slug && slugDrift(w.slug, w.headword).suffixed)) {
    const base = w.slug!.replace(/-\d+$/, '')
    const holder = await db.query.words.findFirst({
      where: eq(schema.words.slug, base),
      with: { links: { columns: { status: true }, with: { entry: { columns: { status: true } } } } },
    })
    suffixed.push({
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
  return { suffixed, mismatched }
})
