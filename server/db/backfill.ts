import { eq, isNull } from 'drizzle-orm'
import type { Db } from './index'
import * as schema from './schema'
import { uniqueSlug } from '../utils/slug'

/**
 * Fills in words.slug for any row that does not have one yet (docs/REACH.md,
 * Phase R5) — the backfill the plan calls for, run here rather than as a
 * one-off script so it needs no manual step on deploy: a fresh database has
 * nothing to do, and an existing one catches up once on the first startup
 * after this shipped, exactly the way seedIfEmpty and ensureDevAdmin already
 * do in this file.
 *
 * Rows are done one at a time, not in parallel: uniqueSlug checks the slug
 * column for a clash, and two rows racing to claim the same base slug at once
 * would both see it free and collide on insert.
 */
export async function backfillWordSlugs(db: Db): Promise<void> {
  const rows = await db.select({ id: schema.words.id, headword: schema.words.headword })
    .from(schema.words).where(isNull(schema.words.slug))
  if (!rows.length) return

  console.log(`[lahga] backfilling slugs for ${rows.length} word(s)`)
  for (const row of rows) {
    const slug = await uniqueSlug(db, row.headword)
    await db.update(schema.words).set({ slug }).where(eq(schema.words.id, row.id))
  }
}
