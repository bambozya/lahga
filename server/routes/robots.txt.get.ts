/**
 * robots.txt. Everything public is open to crawlers, including the AI ones:
 * the whole point of the site is to be found when someone asks how a word is
 * said in a dialect. Only account and admin paths are closed.
 */
export default defineEventHandler((event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /settings',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /reset',
    'Disallow: /verify',
    'Disallow: /api/',
    'Disallow: /auth/',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n')
})
