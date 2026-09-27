/**
 * Notes who asked for a /?q= page before the rendered-page cache strips the
 * request down to its URL, so a search that finds nothing can still be logged
 * with where it came from. The page hands the id on to /api/words; see
 * server/utils/searchVisitor.ts for why the detour is needed.
 */
export default defineEventHandler((event) => {
  if (event.method !== 'GET') return
  const url = getRequestURL(event)
  if (url.pathname !== '/' || !url.searchParams.get('q')?.trim()) return
  // The rendered page reads this from its own event, which shares this context.
  event.context.searchVisit = rememberPageVisit(event)
})
