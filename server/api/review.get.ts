import { and, asc, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../db'

/**
 * The review list (/review): every draft still waiting for a speaker
 * (schema.wordEntryLinks.needsReview), one dialect at a time, so a Libyan
 * reader can be sent a single link and go through the Libyan column.
 * Always returns how many drafts each dialect has; `?dialect=` adds that
 * dialect's items, alphabetical by headword, a page of 200 at a time.
 */
const PAGE = 200

export default defineEventHandler(async (event) => {
  // Staff only for now: ordinary readers are not shown which forms are drafts.
  await requireStaff(event)
  const query = getQuery(event)
  const slug = typeof query.dialect === 'string' ? query.dialect : ''
  const page = Math.max(1, Number(query.page) || 1)
  const db = await useDb()
  const l = schema.wordEntryLinks, e = schema.entries, w = schema.words, d = schema.dialects
  const live = and(eq(l.needsReview, true), eq(l.status, 'active'), eq(e.status, 'active'), eq(w.status, 'active'))

  const counts = await db.select({ slug: d.slug, nameAr: d.nameAr, n: sql<number>`count(*)::int` })
    .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
    .where(live).groupBy(d.slug, d.nameAr, d.sortOrder).orderBy(asc(d.sortOrder))

  const items = slug
    ? await db.select({ linkId: l.id, form: e.form, headword: w.headword, wordSlug: w.slug })
      .from(l).innerJoin(e, eq(l.entryId, e.id)).innerJoin(w, eq(l.wordId, w.id)).innerJoin(d, eq(e.dialectId, d.id))
      .where(and(live, eq(d.slug, slug))).orderBy(asc(w.headword)).limit(PAGE).offset((page - 1) * PAGE)
    : []

  return { counts, items, page, pageSize: PAGE }
})
