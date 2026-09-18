import { count, eq, isNull, gte } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** The admin dashboard numbers. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0)
  const [openFlags, pendingProposals, users, wordsToday, entriesToday] = await Promise.all([
    one(db.select({ n: count() }).from(schema.flags).where(isNull(schema.flags.resolvedAt))),
    one(db.select({ n: count() }).from(schema.proposals).where(eq(schema.proposals.status, 'pending'))),
    one(db.select({ n: count() }).from(schema.users).where(isNull(schema.users.deletedAt))),
    one(db.select({ n: count() }).from(schema.words).where(gte(schema.words.createdAt, dayAgo))),
    one(db.select({ n: count() }).from(schema.entries).where(gte(schema.entries.createdAt, dayAgo))),
  ])
  return { openFlags, pendingProposals, users, wordsToday, entriesToday }
})
