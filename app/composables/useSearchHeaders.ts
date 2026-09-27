/**
 * Headers for a search request, so a search that finds nothing can be logged
 * with where it came from (server/utils/searchVisitor.ts). No cookie, and
 * nothing the request does not already reveal, except two small things only
 * this page's script knows: the browser's time zone, and the site the visitor
 * arrived from.
 *
 * On the server the page passes on the id the search-visit middleware gave the
 * visitor's own request instead, since the render no longer carries its headers.
 */
export function useSearchHeaders(): Record<string, string> {
  if (import.meta.server) {
    const id = useRequestEvent()?.context.searchVisit as string | undefined
    return id ? { 'x-lahga-visit': id } : {}
  }
  const headers: Record<string, string> = {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) headers['x-lahga-tz'] = tz
  } catch { /* an old browser: no time zone, that is all */ }
  try {
    const from = document.referrer ? new URL(document.referrer).hostname : ''
    if (from && from !== location.hostname) headers['x-lahga-from'] = from
  } catch { /* no referrer */ }
  return headers
}
