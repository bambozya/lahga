import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { readBody$ } from '../../../utils/validate'

/**
 * «هل تُقال هكذا في …؟» under a draft (schema.wordEntryLinks.needsReview),
 * answered by anyone reading the word page: 1 (yes), -1 (no) or 0 (take it
 * back). A member with a verified email votes on the link like anywhere else;
 * everyone else — not signed in, or not verified yet — gives a guest answer
 * that counts half (GUEST_WEIGHT in server/utils/votes.ts). A «yes» from
 * someone who speaks for the draft's dialect — an admin, a moderator, or an
 * expert in it (server/utils/experts.ts) — checks it on its own. Either way the
 * draft is settled here, and `confirmed` says whether this answer checked it.
 */
const Body = v.object({ value: v.picklist([1, -1, 0], 'قيمة التصويت غير صالحة') })

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'رقم غير صالح' })
  const { value } = await readBody$(event, Body)
  const { user: signedIn } = await getUserSession(event)
  const user = signedIn ? await requireUser(event) : null
  const member = user?.emailVerifiedAt ? user : null
  if (member) assertRateLimit(`vote:${member.id}`, 120, 60 * 60 * 1000)
  else assertRateLimit(`guest-vote:${clientIp(event)}`, 60, 60 * 60 * 1000)

  const db = await useDb()
  const l = schema.wordEntryLinks
  const [link] = await db.select({ createdBy: l.createdBy, dialectId: schema.entries.dialectId }).from(l)
    .innerJoin(schema.entries, eq(schema.entries.id, l.entryId))
    .where(and(eq(l.id, id), eq(l.needsReview, true), eq(l.status, 'active')))
  if (!link) throw createError({ statusCode: 404, statusMessage: 'ليس بحاجة إلى تحقق' })

  if (member) {
    if (link.createdBy === member.id) throw createError({ statusCode: 400, statusMessage: 'لا يمكنك التصويت على ما أضفته أنت' })
    return db.transaction(async (tx) => {
      const { mine, confirmed } = await applyVote(tx, member.id, 'link', id, value)
      if (confirmed || value !== 1 || !await speaksFor(tx, member, link.dialectId)) return { mine, confirmed }
      return { mine, confirmed: await confirmDraft(tx, id, member.id, 'تأكيد من متحدّث موثوق') }
    })
  }
  return db.transaction(tx => applyGuestVote(tx, id, guestVoter(event, id), value))
})
