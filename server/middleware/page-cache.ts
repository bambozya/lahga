import { normalizeCacheKey, sweepPageCache } from '../utils/pageCache'

/**
 * Keeps the rendered-page cache from growing on junk URLs.
 *
 * Nitro builds a cached page's key from `req.originalUrl || req.url`, and
 * `originalUrl` is read nowhere else in Nuxt or Nitro — verified by reading
 * their runtimes, not assumed — so setting it here changes the cache key and
 * nothing else. The request still routes and renders from the URL the visitor
 * asked for, query string intact.
 */
let lastSweep = Date.now()

export default defineEventHandler((event) => {
  if (event.method !== 'GET') return
  const url = event.node.req.url
  if (!url) return

  const normalized = normalizeCacheKey(url)
  if (normalized) event.node.req.originalUrl = normalized

  if (Date.now() - lastSweep > 60_000) {
    lastSweep = Date.now()
    // Nothing waits for this: a full cache is not a reason to slow a response.
    sweepPageCache().catch(() => {})
  }
})
