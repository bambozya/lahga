import { useDb } from '../db'
import { topPairs } from '../utils/dialects'

/**
 * The dialect pairs worth comparing, most words in common first (docs/REACH.md,
 * Phase R4) — what the comparison links are built from, so the site never
 * offers a pair with nothing on it.
 *
 * Counted by group, so a pair means two regions rather than two arbitrary
 * sub-dialects, and only pairs above MIN_SHARED (shared/config/rules.ts) are
 * returned. The query is topPairs() in server/utils/dialects.ts, which the
 * sitemap uses too.
 */
export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event)
  return topPairs(await useDb(), limitParam(limit, 10, 40))
})
