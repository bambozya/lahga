import { sql } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { normalizeArabic } from '../../shared/utils/arabic'

/**
 * «ليست الكلمة التي أبحث عنها»: a search found words, and the searcher says
 * none of them is the one they meant. The looser second search
 * (server/api/words/index.get.ts) can answer «كمترا» with كمثرى, which is right,
 * or a word with a homograph, which is not; only the searcher can tell, so the
 * home page lets them. The term joins the list of missing words at
 * /settings/admin/search-misses with its own count, and clearing «found» terms
 * there leaves reported ones alone.
 *
 * Open to everyone like the search itself, no account needed: a report costs
 * the site a row, not a page. Limited per IP so it cannot flood the list.
 */
export default defineEventHandler(async (event) => {
  assertRateLimit(`search-report:${clientIp(event)}`, 10, 10 * 60 * 1000)
  const body = await readBody<{ q?: unknown }>(event)
  const raw = searchTerm(body?.q)
  const term = normalizeArabic(raw)
  if (term.length < 2) throw createError({ statusCode: 400, statusMessage: 'الكلمة قصيرة جداً' })

  const db = await useDb()
  const [miss] = await db.insert(schema.searchMisses)
    .values({ term: raw.slice(0, 200), termNormalized: term, reports: 1 })
    .onConflictDoUpdate({
      target: schema.searchMisses.termNormalized,
      set: { reports: sql`${schema.searchMisses.reports} + 1`, lastSearchedAt: new Date() },
    })
    .returning({ id: schema.searchMisses.id })
  await db.insert(schema.searchMissEvents).values({ missId: miss!.id, ...describeSearcher(event), kind: 'report' })
  await pruneSearchMissEvents(db)
  return { ok: true }
})
