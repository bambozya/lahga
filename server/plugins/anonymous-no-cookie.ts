import type { H3Event } from 'h3'

/**
 * Visitors who are not logged in get no cookie at all.
 *
 * The session library creates an empty session (just a random id) for every
 * request that reads the session, and sends it as the "nuxt-session" cookie.
 * A visitor who only reads the site has no use for it, so these hooks drop that
 * Set-Cookie header whenever the session holds no user, on normal responses and
 * on error responses (a 401 from a protected route, for instance). Logging in
 * still sets the cookie, and logging out still clears it: the cleared session is
 * no longer in event.context, so its expiring cookie passes through.
 */
function dropAnonymousSessionCookie(event: H3Event) {
  const session = event.context.sessions?.['nuxt-session'] as { data?: { user?: unknown } } | undefined
  if (!session || session.data?.user) return
  const res = event.node.res
  if (res.headersSent) return
  const header = res.getHeader('set-cookie')
  if (!header) return
  const cookies = (Array.isArray(header) ? header : [String(header)]).filter(c => !c.startsWith('nuxt-session='))
  if (cookies.length) res.setHeader('set-cookie', cookies)
  else res.removeHeader('set-cookie')
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', event => dropAnonymousSessionCookie(event))
  nitro.hooks.hook('error', (_error, { event }) => { if (event) dropAnonymousSessionCookie(event) })
})
