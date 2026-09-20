import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { entryCounts, MIN_ENTRIES } from '../api/dialects/index.get'
import { topPairs } from '../api/dialect-pairs.get'

/**
 * The sitemap, built from the database on request: every public page, every
 * dialect and every active word. Cached for an hour, since the set changes
 * slowly and crawlers fetch it often.
 */
const STATIC = ['/', '/dialects', '/divergent', '/about', '/terms', '/privacy', '/contact']

export default defineEventHandler(async (event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const db = await useDb()
  const [words, dialects] = await Promise.all([
    db.select({ id: schema.words.id, updatedAt: schema.words.updatedAt }).from(schema.words)
      .where(eq(schema.words.status, 'active')).orderBy(desc(schema.words.updatedAt)).limit(45000),
    db.select({ id: schema.dialects.id, slug: schema.dialects.slug, parentId: schema.dialects.parentId })
      .from(schema.dialects).where(eq(schema.dialects.active, 1)),
  ])

  // A sub-dialect with nothing in it has an empty page; crawlers are not sent to it.
  // Only pairs with enough in common are listed; the thin ones ask not to be
  // indexed (see app/pages/d/[slug]/vs/[b].vue), so they must not appear here.
  const pairs = await topPairs(db, 40)
  const filled = await entryCounts(db)
  const listed = dialects.filter(d => d.parentId === null || (filled.get(d.id) ?? 0) >= MIN_ENTRIES)

  const day = (d: Date | null) => (d ?? new Date()).toISOString().slice(0, 10)
  const url = (loc: string, lastmod?: string, priority?: string) =>
    `<url><loc>${site}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC.map(p => url(p, undefined, p === '/' ? '1.0' : '0.7')),
    ...listed.map(d => url(`/d/${d.slug}`, undefined, '0.8')),
    ...pairs.map((p: { a: { slug: string }, b: { slug: string } }) => url(`/d/${p.a.slug}/vs/${p.b.slug}`, undefined, '0.5')),
    ...words.map(w => url(`/w/${w.id}`, day(w.updatedAt), '0.6')),
    '</urlset>',
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
