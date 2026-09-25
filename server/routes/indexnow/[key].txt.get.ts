/**
 * The IndexNow key file (server/utils/indexnow.ts). The protocol proves you
 * own the site by fetching a text file that contains the key; it lives under
 * /indexnow/ rather than at the root so a catch-all `*.txt` route never has to
 * exist next to robots.txt. Any other name, or no key configured, is a 404.
 */
export default defineEventHandler((event) => {
  const key = useRuntimeConfig().indexnowKey
  // Read from the path rather than the router param: with the extension in
  // the file name the param's own name is not "key" any more.
  const asked = (event.path.split('?')[0]!.split('/').pop() ?? '').replace(/\.txt$/, '')
  if (!key || asked !== key) throw createError({ statusCode: 404 })
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return key
})
