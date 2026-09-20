/**
 * The share card for the divergence ranking (docs/REACH.md, Phase R4).
 *
 * Cached by the ranking's own top rows rather than by time: the list only
 * moves when the dictionary does, and rendering it per crawler hit is the one
 * way a card becomes an outage.
 */
const cache = new LruCache<string, Buffer>(4)

export default defineEventHandler(async (event) => {
  const words = await $fetch<{ headword: string, forms: number, groups: number }[]>('/api/divergent', {
    query: { limit: 5 },
  })

  const cacheKey = words.map(w => `${w.headword}:${w.forms}`).join('|') || 'empty'
  let png = cache.get(cacheKey)
  if (!png) {
    png = await renderCardPng(await divergentCardSvg({ words }))
    cache.set(cacheKey, png)
  }

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return png
})
