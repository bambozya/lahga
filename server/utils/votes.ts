import { and, eq, inArray, sql } from 'drizzle-orm'
import { schema } from '../db'
import type { Tx } from './contribute'

export type VoteTarget = 'word' | 'entry' | 'link' | 'example'

const tables = {
  word: schema.words,
  entry: schema.entries,
  link: schema.wordEntryLinks,
  example: schema.examples,
} as const

/** The target row, if it exists and is active. */
export async function findTarget(tx: Tx, targetType: VoteTarget, targetId: number) {
  const table = tables[targetType]
  const [row] = await tx.select({ id: table.id, status: table.status, createdBy: table.createdBy }).from(table).where(eq(table.id, targetId))
  return row && row.status === 'active' ? row : null
}

/**
 * Sets the user's vote on a target to +1, -1 or 0 (removed), then recomputes the
 * target's upvotes, downvotes and score from the votes table so the counts can
 * never drift. Returns the new counts.
 */
export async function applyVote(tx: Tx, userId: number, targetType: VoteTarget, targetId: number, value: 1 | -1 | 0) {
  const where = and(eq(schema.votes.targetType, targetType), eq(schema.votes.targetId, targetId), eq(schema.votes.userId, userId))
  if (value === 0) {
    await tx.delete(schema.votes).where(where)
  } else {
    await tx.insert(schema.votes).values({ targetType, targetId, userId, value })
      .onConflictDoUpdate({ target: [schema.votes.targetType, schema.votes.targetId, schema.votes.userId], set: { value, updatedAt: new Date() } })
  }
  const [counts] = await tx.select({
    up: sql<number>`count(*) filter (where ${schema.votes.value} > 0)`,
    down: sql<number>`count(*) filter (where ${schema.votes.value} < 0)`,
  }).from(schema.votes).where(and(eq(schema.votes.targetType, targetType), eq(schema.votes.targetId, targetId)))
  const upvotes = Number(counts?.up ?? 0), downvotes = Number(counts?.down ?? 0)
  const table = tables[targetType]
  await tx.update(table).set({ upvotes, downvotes, score: upvotes - downvotes }).where(eq(table.id, targetId))
  return { upvotes, downvotes, score: upvotes - downvotes, mine: value }
}

/** The user's votes on a set of targets of one type: id -> +1 | -1. */
export async function myVotes(tx: Tx, userId: number | undefined, targetType: VoteTarget, ids: number[]): Promise<Record<number, number>> {
  if (!userId || !ids.length) return {}
  const rows = await tx.select({ id: schema.votes.targetId, value: schema.votes.value }).from(schema.votes)
    .where(and(eq(schema.votes.userId, userId), eq(schema.votes.targetType, targetType), inArray(schema.votes.targetId, ids)))
  return Object.fromEntries(rows.map(r => [r.id, r.value]))
}

/**
 * Lower bound of the Wilson score interval (95%): how good an item probably is,
 * given how few votes it has. Five clean upvotes beat fifty mixed ones.
 */
export function wilson(up: number, down: number): number {
  const n = up + down
  if (!n) return 0
  const z = 1.96, p = up / n
  return (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n)
}
