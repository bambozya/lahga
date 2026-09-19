import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/**
 * The share card for a word (docs/REACH.md, Phase R2): pasted into WhatsApp,
 * this is the preview, not a link to it. Cached hard, keyed by the word's own
 * `updatedAt` plus the latest of its shown entries', so an edit invalidates it
 * but nothing else does.
 */
const cache = new LruCache<string, Buffer>(300)

export default defineEventHandler(async (event) => {
  // Nitro's filename router treats "[id].png" as one segment named "id.png" (its
  // value carrying the literal ".png"), not a dynamic "id" with a literal suffix —
  // confirmed by logging event.context.params against a real request.
  const id = Number(String(getRouterParam(event, 'id.png')).replace(/\.png$/, ''))
  if (!Number.isInteger(id)) throw createError({ statusCode: 404 })
  const db = await useDb()

  const word = await db.query.words.findFirst({
    where: eq(schema.words.id, id),
    with: {
      links: {
        with: { entry: { with: { dialect: { with: { parent: true } } } } },
      },
    },
  })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404 })

  const entries = word.links
    .filter(l => l.status === 'active' && l.entry.status === 'active')
    .map(l => ({
      id: l.entry.id,
      form: l.entry.form,
      score: l.entry.score,
      rank: wilson(l.entry.upvotes, l.entry.downvotes),
      updatedAt: l.entry.updatedAt,
      // The card names the entry's own dialect (e.g. قاهري, نجدي), not its
      // parent group — "أوي مصري، قاهري" is the point of the "تُقال" line.
      // group is still what groupByRegion sorts and clusters by, so Cairene
      // and Egyptian entries land next to each other even though their names
      // differ.
      dialectName: l.entry.dialect.nameAr,
      group: l.entry.dialect.parent
        ? { slug: l.entry.dialect.parent.slug, nameAr: l.entry.dialect.parent.nameAr }
        : { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
    }))

  const ranked = groupByRegion(entries).flatMap(g => g.entries)
  const newest = ranked.reduce((max, e) => Math.max(max, +new Date(e.updatedAt)), +new Date(word.updatedAt))
  // Capped so a very well-documented word cannot push the card past its fixed
  // portrait height; 14 keeps the "تُقال" line to a handful of lines at the
  // card's font size in practice.
  const CAP = 14
  const cacheKey = `${id}:${newest}:${CAP}`

  let png = cache.get(cacheKey)
  if (!png) {
    const svg = await wordCardSvg({
      headword: word.headword,
      definition: word.definition,
      forms: ranked.slice(0, CAP).map(e => ({ form: e.form, dialectName: e.dialectName })),
    })
    png = await renderCardPng(svg)
    cache.set(cacheKey, png)
  }

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400, stale-while-revalidate=604800')
  return png
})
