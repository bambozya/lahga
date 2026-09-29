import type { H3Event } from 'h3'
import { createHmac } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { schema } from '../db'
import { recordRevision, type Tx } from './contribute'
import { clientIp } from './rateLimit'

/** Net upvotes on a link that take a draft off the review list. */
export const CONFIRM_SCORE = 2
/** What a guest's answer on a draft counts next to a member's (schema.guestVotes). */
export const GUEST_WEIGHT = 0.5

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
  const confirmed = targetType === 'link' && await settleDraft(tx, targetId, userId)
  return { upvotes, downvotes, score: upvotes - downvotes, mine: value, confirmed }
}

/**
 * Two speakers more saying «yes, we say that» than «no» is what checks a draft
 * (schema.wordEntryLinks.needsReview): members' net votes on the link, plus
 * guests' at GUEST_WEIGHT. Only ever cleared here, never set back: a form that
 * later draws downvotes is a matter for flags. True when this call cleared it.
 */
export async function settleDraft(tx: Tx, linkId: number, byUserId: number | null) {
  const l = schema.wordEntryLinks, g = schema.guestVotes
  const [link] = await tx.select({ score: l.score, needsReview: l.needsReview }).from(l).where(eq(l.id, linkId))
  if (!link?.needsReview) return false
  const [guests] = await tx.select({ net: sql<number>`coalesce(sum(${g.value}), 0)` }).from(g).where(eq(g.linkId, linkId))
  if (link.score + GUEST_WEIGHT * Number(guests?.net ?? 0) < CONFIRM_SCORE) return false
  const [cleared] = await tx.update(l).set({ needsReview: false })
    .where(and(eq(l.id, linkId), eq(l.needsReview, true))).returning({ id: l.id })
  if (cleared) await recordRevision(tx, 'link', linkId, { needsReview: false }, byUserId, 'تأكيد بالتصويت')
  return !!cleared
}

/**
 * Who a guest is, for one draft: a keyed hash of their IP address and the link.
 * The key is the session secret, so nobody without it can tell which address
 * a hash came from, and the link id in it means one visitor's answers on two
 * drafts share nothing. No cookie: the visitor carries nothing away.
 */
export function guestVoter(event: H3Event, linkId: number) {
  return createHmac('sha256', useRuntimeConfig().session.password)
    .update(`guest-vote|${linkId}|${clientIp(event)}`).digest('hex').slice(0, 32)
}

/** Sets a guest's answer on a draft to +1, -1 or 0 (removed), then settles the draft. */
export async function applyGuestVote(tx: Tx, linkId: number, voter: string, value: 1 | -1 | 0) {
  const g = schema.guestVotes
  if (value === 0) {
    await tx.delete(g).where(and(eq(g.linkId, linkId), eq(g.voter, voter)))
  } else {
    await tx.insert(g).values({ linkId, voter, value })
      .onConflictDoUpdate({ target: [g.linkId, g.voter], set: { value, updatedAt: new Date() } })
  }
  return { mine: value, confirmed: await settleDraft(tx, linkId, null) }
}

/** A guest's own answers on a set of drafts: id -> +1 | -1. */
export async function myGuestVotes(tx: Tx, event: H3Event, linkIds: number[]): Promise<Record<number, number>> {
  if (!linkIds.length) return {}
  const g = schema.guestVotes
  const rows = await tx.select({ id: g.linkId, value: g.value }).from(g)
    .where(and(inArray(g.linkId, linkIds), inArray(g.voter, linkIds.map(id => guestVoter(event, id)))))
  return Object.fromEntries(rows.map(r => [r.id, r.value]))
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
