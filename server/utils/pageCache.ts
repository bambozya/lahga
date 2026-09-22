/**
 * The rendered-page cache behind the `swr` route rules in nuxt.config.ts.
 *
 * Nitro keeps those pages in `useStorage('cache')` — a plain in-memory map in
 * production — under a key built from the whole request URL, query string and
 * all. Nothing evicts them and nothing tells them about an edit, so two things
 * need doing here:
 *
 *   normalizeCacheKey  one entry per page instead of one per URL, so
 *                      /w/كلمة?n=1, ?n=2, … cannot fill memory
 *   sweepPageCache     a ceiling for what is left (searches are a real, and
 *                      unbounded, key space), oldest out first
 *   purgePageCache     forget everything after content changes, so a hidden
 *                      entry leaves the site within a request rather than
 *                      within the stale window
 */

/** Where Nitro files route-rule pages inside the `cache` mount: base:group:name. */
const ROUTES_PREFIX = 'nitro:routes'

/**
 * Past this many cached pages the oldest are dropped. The site has ~600
 * cacheable pages, so in normal use this is never reached; it exists because a
 * search term is part of the key on `/` and nobody can be stopped from
 * inventing them.
 */
const MAX_ENTRIES = 2000

/**
 * The query parameters that change what a cached page renders. Everything else
 * is dropped before Nitro sees the URL. A path that is not listed here is not
 * cached (see `routeRules`) and is left alone.
 */
const CACHED_PATHS: { test: (path: string) => boolean, params: string[] }[] = [
  { test: p => p === '/', params: ['q'] },
  // `added` is the «أُضيفت الكلمة» notice a contributor lands on. It is one extra
  // entry for a word somebody just added, and dropping it would render the page
  // without the notice and then fight the client over it during hydration.
  { test: p => p.startsWith('/w/') && p.indexOf('/', 3) === -1, params: ['added'] },
  { test: p => p.startsWith('/d/'), params: [] },
  { test: p => p === '/divergent', params: [] },
  { test: p => p === '/daily' || p.startsWith('/daily/'), params: [] },
  { test: p => p === '/games', params: [] },
  { test: p => p === '/which-dialect', params: [] },
]

/** Long enough for any real search; a longer one is refused by the API anyway. */
const MAX_PARAM_LENGTH = 100

/**
 * The URL Nitro should build this request's cache key from, or undefined to
 * leave it alone. Only the parameters that change the page survive, in a fixed
 * order, so ?a=1&b=2 and ?b=2&a=1 are one entry.
 */
export function normalizeCacheKey(url: string): string | undefined {
  const mark = url.indexOf('?')
  if (mark === -1) return undefined
  const path = url.slice(0, mark)
  const rule = CACHED_PATHS.find(r => r.test(path))
  if (!rule) return undefined

  const given = new URLSearchParams(url.slice(mark + 1))
  const kept: string[] = []
  for (const name of rule.params) {
    const value = given.get(name)
    if (value) kept.push(`${name}=${encodeURIComponent(value.slice(0, MAX_PARAM_LENGTH))}`)
  }
  return kept.length ? `${path}?${kept.join('&')}` : path
}

/**
 * Drops the oldest pages once there are more than MAX_ENTRIES. Reads each
 * entry for the `mtime` Nitro stores on it; that is a map lookup per key, so
 * it stays cheap at this size, and the caller runs it at most once a minute.
 */
export async function sweepPageCache(): Promise<number> {
  const storage = useStorage('cache')
  const keys = await storage.getKeys(ROUTES_PREFIX)
  if (keys.length <= MAX_ENTRIES) return 0

  const aged = await Promise.all(keys.map(async (key) => {
    const entry = await storage.getItem(key).catch(() => null) as { mtime?: number } | null
    return { key, mtime: entry?.mtime ?? 0 }
  }))
  aged.sort((a, b) => a.mtime - b.mtime)
  // Down to four fifths, so a busy minute does not sweep on every request.
  const doomed = aged.slice(0, keys.length - Math.floor(MAX_ENTRIES * 0.8))
  await Promise.all(doomed.map(d => storage.removeItem(d.key).catch(() => {})))
  return doomed.length
}

/**
 * Forgets every cached page. Called after content changes (see
 * server/plugins/page-cache-purge.ts).
 *
 * All of it, not the one page that changed: Nitro hashes the URL into the key
 * and strips the Arabic out of the readable part of it, so every word page
 * shares one prefix and a single page cannot be addressed without
 * reimplementing that hash. Clearing is correct whatever the key looks like,
 * and the pages cost a query each to rebuild.
 */
export async function purgePageCache(): Promise<number> {
  const storage = useStorage('cache')
  const keys = await storage.getKeys(ROUTES_PREFIX)
  await Promise.all(keys.map(k => storage.removeItem(k).catch(() => {})))
  return keys.length
}
