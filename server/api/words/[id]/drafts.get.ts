import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * The drafts on one word page (schema.wordEntryLinks.needsReview): the links
 * a language model drafted and nobody has confirmed yet, with the viewer's own
 * answer on each — their vote if they are a verified member, their guest
 * answer otherwise (server/utils/votes.ts). It lives apart from
 * GET /api/words/[id] because that one is cached for everyone and this answer
 * depends on who asks; the word page asks for it once it has loaded.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'رقم غير صالح' })
  const { user } = await getUserSession(event)
  const db = await useDb()
  const l = schema.wordEntryLinks
  const rows = await db.select({ linkId: l.id }).from(l)
    .where(and(eq(l.wordId, id), eq(l.needsReview, true), eq(l.status, 'active')))
  const ids = rows.map(r => r.linkId)
  const votes = user?.emailVerified ? await myVotes(db, user.id, 'link', ids) : await myGuestVotes(db, event, ids)
  return rows.map(r => ({ linkId: r.linkId, myVote: votes[r.linkId] ?? 0 }))
})
