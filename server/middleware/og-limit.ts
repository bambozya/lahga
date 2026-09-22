/**
 * One limit for every share card (/og/*). A miss rasterises a PNG, which is the
 * most expensive thing an anonymous request can ask this server for: each route
 * keeps an LRU so a repeat is cheap, but cycling word ids — or dates on the
 * result cards — walks straight past it and pins a core.
 *
 * Generous enough for a person sharing a handful of links and for a crawler
 * that fetches a card per page; only a loop notices it.
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/og/')) return
  assertRateLimit(`og:${clientIp(event)}`, 120, 60 * 1000)
})
