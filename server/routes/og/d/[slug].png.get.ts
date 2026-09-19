import { and, count, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** The share card for a dialect page (docs/REACH.md, Phase R2): its name, description and how many words it holds. */
const cache = new LruCache<string, Buffer>(60)

export default defineEventHandler(async (event) => {
  // See the comment in server/routes/og/w/[id].png.get.ts: the router param is
  // named "slug.png", not "slug", because that is one literal filename segment.
  const slug = String(getRouterParam(event, 'slug.png')).replace(/\.png$/, '')
  const db = await useDb()

  const dialect = await db.query.dialects.findFirst({
    where: eq(schema.dialects.slug, slug),
    with: { children: true },
  })
  if (!dialect || dialect.active !== 1) throw createError({ statusCode: 404 })

  const dialectIds = [dialect.id, ...dialect.children.map(c => c.id)]
  const counted = await db.select({ n: count() }).from(schema.entries)
    .innerJoin(schema.wordEntryLinks, eq(schema.wordEntryLinks.entryId, schema.entries.id))
    .where(and(
      inArray(schema.entries.dialectId, dialectIds),
      eq(schema.entries.status, 'active'),
      eq(schema.wordEntryLinks.status, 'active'),
    ))
  const n = counted[0]?.n ?? 0

  // The description can change through the proposal flow; nothing marks when,
  // so the card is cached on the word count instead, which moves often enough
  // on its own to keep this from ever being too stale to matter.
  const cacheKey = `${slug}:${n}`
  let png = cache.get(cacheKey)
  if (!png) {
    const summary = (dialect.descriptionAr ?? '').split(/\n\s*\n/)[0]?.trim() || null
    const svg = await dialectCardSvg({ nameAr: dialect.nameAr, description: summary, wordCount: n })
    png = await renderCardPng(svg)
    cache.set(cacheKey, png)
  }

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400, stale-while-revalidate=604800')
  return png
})
