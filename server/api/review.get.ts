import { and, asc, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { CONFIRM_SCORE, GUEST_WEIGHT } from '../../shared/config/rules'

/**
 * The review list (/review): every draft still waiting for a speaker
 * (schema.wordEntryLinks.needsReview), one dialect at a time, so a Libyan
 * reader can be sent a single link and go through the Libyan column.
 * Always returns how many drafts each dialect has; `?dialect=` adds that
 * dialect's items, alphabetical by headword, a page of 200 at a time.
 *
 * `rejected` counts, and `?rejected=1` lists, the drafts speakers have turned
 * down on /check or a word page (net −CONFIRM_SCORE, shared/utils/drafts.ts):
 * the queue stops asking about those, so somebody here corrects or deletes them.
 */
const PAGE = 200

export default defineEventHandler(async (event) => {
  // Staff only for now: ordinary readers are not shown which forms are drafts.
  await requireStaff(event)
  const query = getQuery(event)
  const slug = typeof query.dialect === 'string' ? query.dialect : ''
  const page = Math.max(1, Number(query.page) || 1)
  const onlyRejected = query.rejected === '1'
  const db = await useDb()
  const l = schema.wordEntryLinks, e = schema.entries, w = schema.words, d = schema.dialects, g = schema.guestVotes
  const live = and(eq(l.needsReview, true), eq(l.status, 'active'), eq(e.status, 'active'), eq(w.status, 'active'))
  const guestNet = sql<number>`coalesce((select sum(${g.value}) from ${g} where ${g.linkId} = ${l.id}), 0)`
  // Literals, not bound parameters: bound, Postgres reads the numbers as text and cannot add them to a score.
  const turnedDown = sql`(${l.score} + ${sql.raw(String(GUEST_WEIGHT))} * ${guestNet}) <= ${sql.raw(String(-CONFIRM_SCORE))}`

  const counts = await db.select({ slug: d.slug, nameAr: d.nameAr, n: sql<number>`count(*)::int` })
    .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
    .where(live).groupBy(d.slug, d.nameAr, d.sortOrder).orderBy(asc(d.sortOrder))

  const rejected = await db.select({ slug: d.slug, nameAr: d.nameAr, n: sql<number>`count(*)::int` })
    .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
    .where(and(live, turnedDown)).groupBy(d.slug, d.nameAr, d.sortOrder).orderBy(asc(d.sortOrder))

  const items = slug
    ? await db.select({ linkId: l.id, form: e.form, formVocalized: e.formVocalized, headword: w.headword, wordSlug: w.slug, score: l.score, guestNet })
      .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
      .where(and(live, eq(d.slug, slug), ...(onlyRejected ? [turnedDown] : []))).orderBy(asc(w.headword)).limit(PAGE).offset((page - 1) * PAGE)
    : []

  return { counts, rejected, items, page, pageSize: PAGE }
})
