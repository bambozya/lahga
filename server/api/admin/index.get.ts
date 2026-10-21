import { asc, count, eq, isNull, gt, gte } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { dayBefore, todayDate } from '../../../shared/utils/daily'

/**
 * The admin dashboard numbers. `slugs` counts the rows /settings/admin/slugs
 * lists, both tables together, so a word in both counts twice, as it shows.
 *
 * `dailyQueue` is how many days in a row, from tomorrow, already have a
 * curated word for كلمة اليوم (roadmap A8). A future date only has a puzzle
 * if an admin set one; past the end of the run the site picks a word itself
 * on the day, so a short queue is a quality warning, not an outage.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0)
  const [openFlags, pendingProposals, users, wordsToday, entriesToday, searchMisses, live, queued] = await Promise.all([
    one(db.select({ n: count() }).from(schema.flags).where(isNull(schema.flags.resolvedAt))),
    one(db.select({ n: count() }).from(schema.proposals).where(eq(schema.proposals.status, 'pending'))),
    one(db.select({ n: count() }).from(schema.users).where(isNull(schema.users.deletedAt))),
    one(db.select({ n: count() }).from(schema.words).where(gte(schema.words.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(schema.entries).where(gte(schema.entries.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(schema.searchMisses)),
    db.select({ headword: schema.words.headword, slug: schema.words.slug }).from(schema.words).where(eq(schema.words.status, 'active')),
    db.select({ date: schema.dailyPuzzles.date }).from(schema.dailyPuzzles)
      .where(gt(schema.dailyPuzzles.date, todayDate())).orderBy(asc(schema.dailyPuzzles.date)).limit(60),
  ])
  let slugs = 0
  for (const w of live) {
    if (!w.slug) continue
    const drift = slugDrift(w.slug, w.headword)
    slugs += Number(drift.suffixed) + Number(drift.mismatched)
  }
  // Count the unbroken run: each queued date must be the day after the one before it.
  let dailyQueue = 0
  let last = todayDate()
  for (const { date } of queued) {
    if (dayBefore(date) !== last) break
    dailyQueue++
    last = date
  }
  return { openFlags, pendingProposals, users, wordsToday, entriesToday, searchMisses, slugs, dailyQueue }
})
