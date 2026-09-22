import { purgePageCache } from '../utils/pageCache'

/**
 * Forgets the cached pages after anything that changes what they show.
 *
 * One hook rather than a call in each handler: every content route is covered,
 * including the ones added after this was written. Without it an entry an admin
 * hides stays on the word page for the rest of its stale window.
 *
 * Votes are deliberately not here. They only reorder forms within a page, they
 * are the most frequent write the site has, and clearing on each one would keep
 * the cache empty exactly when it is busy.
 */
const CHANGES_CONTENT = /^\/api\/(words|entries|examples|admin\/(content|revisions|import|prune|tidy|retire-entries|proposals))/

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('afterResponse', (event) => {
    if (event.method === 'GET' || event.method === 'HEAD') return
    if (event.node.res.statusCode >= 400) return
    if (!CHANGES_CONTENT.test(event.path)) return
    purgePageCache().catch(() => {})
  })
})
