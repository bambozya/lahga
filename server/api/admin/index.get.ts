import { count, eq, isNull, gte } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * The admin dashboard numbers. `slugs` counts the rows /settings/admin/slugs
 * lists, both tables together, so a word in both counts twice, as it shows.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0)
  const [openFlags, pendingProposals, users, wordsToday, entriesToday, searchMisses, live] = await Promise.all([
    one(db.select({ n: count() }).from(schema.flags).where(isNull(schema.flags.resolvedAt))),
    one(db.select({ n: count() }).from(schema.proposals).where(eq(schema.proposals.status, 'pending'))),
    one(db.select({ n: count() }).from(schema.users).where(isNull(schema.users.deletedAt))),
    one(db.select({ n: count() }).from(schema.words).where(gte(schema.words.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(schema.entries).where(gte(schema.entries.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(schema.searchMisses)),
    db.select({ headword: schema.words.headword, slug: schema.words.slug }).from(schema.words).where(eq(schema.words.status, 'active')),
  ])
  let slugs = 0
  for (const w of live) {
    if (!w.slug) continue
    const drift = slugDrift(w.slug, w.headword)
    slugs += Number(drift.suffixed) + Number(drift.mismatched)
  }
  return { openFlags, pendingProposals, users, wordsToday, entriesToday, searchMisses, slugs }
})
