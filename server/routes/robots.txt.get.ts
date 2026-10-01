/**
 * robots.txt. Everything public is open to crawlers, including the AI ones:
 * the whole point of the site is to be found when someone asks how a word is
 * said in a dialect. Only account and admin paths are closed.
 *
 * /login, /register, /reset and /verify are not listed on purpose: they carry
 * a noindex tag, and a crawler barred from a page never reads that tag, so the
 * bare URL ends up in the index anyway (as /login did).
 */
export default defineEventHandler((event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /settings',
    'Disallow: /api/',
    'Disallow: /auth/',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n')
})
