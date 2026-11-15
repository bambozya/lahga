import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { CHECK_BATCH, CONFIRM_SCORE, GUEST_WEIGHT, RATE_LIMITS } from '../../shared/config/rules'

/**
 * The queue behind «هل تُقال هكذا؟» (/check): drafts nobody has confirmed yet
 * (schema.wordEntryLinks.needsReview), handed out a few at a time to anyone,
 * signed in or not. The answers themselves go to PUT /api/links/[id]/answer,
 * the same place the line under a draft on a word page sends them.
 *
 * Always returns how many drafts each dialect still asks about. `?dialect=`
 * adds a batch for that dialect, leaving out:
 *   - what speakers have turned down (net −CONFIRM_SCORE, the mirror of what
 *     confirms; shared/utils/drafts.ts): those are for staff, on /review
 *   - what this visitor already answered (their votes, or their guest answers)
 *   - what a signed-in member added themselves (they may not vote on it)
 *   - `?skip=1,2,3`: what the page is already holding or the visitor passed on
 * Drafts that already have answers come first, so answers pile up on the same
 * drafts and confirm them instead of spreading thin; the rest at random.
 */
export default defineEventHandler(async (event) => {
  assertRateLimit(`check:${clientIp(event)}`, RATE_LIMITS.check)
  const query = getQuery(event)
  const slug = /^[a-z0-9-]{2,60}$/.test(String(query.dialect ?? '')) ? String(query.dialect) : ''
  const skip = String(query.skip ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 200)
  const { user } = await getUserSession(event)
  const db = await useDb()
  const l = schema.wordEntryLinks, e = schema.entries, w = schema.words, d = schema.dialects, g = schema.guestVotes

  const guestNet = sql<number>`coalesce((select sum(${g.value}) from ${g} where ${g.linkId} = ${l.id}), 0)`
  const guestCount = sql<number>`(select count(*) from ${g} where ${g.linkId} = ${l.id})`
  // The two rule numbers go in as literals: bound, Postgres reads them as text and cannot add them to a score.
  const stillAsked = sql`(${l.score} + ${sql.raw(String(GUEST_WEIGHT))} * ${guestNet}) > ${sql.raw(String(-CONFIRM_SCORE))}`
  const live = and(eq(l.needsReview, true), eq(l.status, 'active'), eq(e.status, 'active'), eq(w.status, 'active'), stillAsked)

  const counts = await db.select({ slug: d.slug, nameAr: d.nameAr, n: sql<number>`count(*)::int` })
    .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
    .where(live).groupBy(d.slug, d.nameAr, d.sortOrder).orderBy(asc(d.sortOrder))
  const dialect = counts.find(c => c.slug === slug) ?? null
  if (!dialect) return { counts, dialect: slug ? { slug, nameAr: (await db.query.dialects.findFirst({ where: eq(d.slug, slug) }))?.nameAr ?? slug, n: 0 } : null, items: [] }

  // More than a batch, since the visitor's own answers are filtered out below.
  const candidates = await db.select({
    linkId: l.id, form: e.form, formVocalized: e.formVocalized, headword: w.headword, definition: w.definition, meaning: e.meaning, wordSlug: w.slug, createdBy: l.createdBy,
  })
    .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
    .where(and(live, eq(d.slug, slug), ...(skip.length ? [notInArray(l.id, skip)] : [])))
    .orderBy(sql`((${l.upvotes} + ${l.downvotes} + ${guestCount}) > 0) desc`, sql`random()`)
    .limit(CHECK_BATCH * 4)

  const ids = candidates.map(c => c.linkId)
  const answered = user?.emailVerified ? await myVotes(db, user.id, 'link', ids) : await myGuestVotes(db, event, ids)
  const items = candidates
    .filter(c => !answered[c.linkId] && !(user && c.createdBy === user.id))
    .slice(0, CHECK_BATCH)
    .map(({ createdBy, ...c }) => c)
  return { counts, dialect, items }
})
