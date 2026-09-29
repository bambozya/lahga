import { and, eq, inArray } from 'drizzle-orm'
import { schema } from '../db'
import type { Tx } from './contribute'

/**
 * Whose word settles a draft (schema.wordEntryLinks.needsReview) on its own:
 * an admin or moderator anywhere, and a dialect expert (schema.dialectExperts)
 * in the draft's dialect or the region above it. Everyone else needs company:
 * two net «yes» from members, a guest's counting half (server/utils/votes.ts).
 */
export async function speaksFor(tx: Tx, user: { id: number, role: string }, dialectId: number) {
  if (user.role === 'admin' || user.role === 'moderator') return true
  const dialect = await tx.query.dialects.findFirst({ where: eq(schema.dialects.id, dialectId), columns: { parentId: true } })
  const covering = [dialectId, ...(dialect?.parentId ? [dialect.parentId] : [])]
  const [row] = await tx.select({ id: schema.dialectExperts.id }).from(schema.dialectExperts)
    .where(and(eq(schema.dialectExperts.userId, user.id), inArray(schema.dialectExperts.dialectId, covering)))
    .limit(1)
  return !!row
}

/**
 * Whether a form this user adds starts out «needs checking», like a
 * language-model draft: yes, unless the user speaks for its dialect
 * (speaksFor), who could confirm it the moment it exists anyway. Applies from
 * the moment a form is added, and to nothing already on the site.
 */
export async function startsUnchecked(tx: Tx, user: { id: number, role: string }, dialectId: number) {
  return !(await speaksFor(tx, user, dialectId))
}

/**
 * Takes the «needs checking» mark off a link, with a revision and a line in the
 * moderation log. False when there was no mark to take off.
 */
export async function confirmDraft(tx: Tx, linkId: number, byUserId: number, reason: string) {
  const [link] = await tx.update(schema.wordEntryLinks).set({ needsReview: false, updatedAt: new Date() })
    .where(and(eq(schema.wordEntryLinks.id, linkId), eq(schema.wordEntryLinks.needsReview, true), eq(schema.wordEntryLinks.status, 'active')))
    .returning({ id: schema.wordEntryLinks.id })
  if (!link) return false
  await recordRevision(tx, 'link', linkId, { needsReview: false }, byUserId, reason)
  await logModeration(tx, byUserId, 'confirm', 'link', linkId)
  return true
}
