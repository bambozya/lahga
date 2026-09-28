import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * The drafts on one word page (schema.wordEntryLinks.needsReview): the links
 * a language model drafted and nobody has confirmed yet, with the viewer's own
 * vote on each. Staff only for now — ordinary readers are not shown which
 * forms are guesses — so it lives apart from GET /api/words/[id], which the
 * page cache serves to everyone. The word page asks for it after it loads,
 * and only when the viewer is an admin or a moderator.
 */
export default defineEventHandler(async (event) => {
  const user = await requireStaff(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'رقم غير صالح' })
  const db = await useDb()
  const l = schema.wordEntryLinks
  const rows = await db.select({ linkId: l.id }).from(l)
    .where(and(eq(l.wordId, id), eq(l.needsReview, true), eq(l.status, 'active')))
  const votes = await myVotes(db, user.id, 'link', rows.map(r => r.linkId))
  return rows.map(r => ({ linkId: r.linkId, myVote: votes[r.linkId] ?? 0 }))
})
