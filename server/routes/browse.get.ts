/**
 * The index used to live at /browse; it is the home page now. Old links and
 * bookmarks (and anything a search engine still holds) keep working.
 */
export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? '').trim()
  return sendRedirect(event, q ? `/?q=${encodeURIComponent(q)}` : '/', 301)
})
