import { and, desc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** One dialect with the entries tagged with it or any of its sub-dialects. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const db = await useDb()

  const dialect = await db.query.dialects.findFirst({
    where: eq(schema.dialects.slug, slug),
    with: { parent: true, children: true },
  })
  if (!dialect) throw createError({ statusCode: 404, statusMessage: 'اللهجة غير موجودة' })

  const dialectIds = [dialect.id, ...dialect.children.map(c => c.id)]
  const entries = await db.query.entries.findMany({
    where: and(inArray(schema.entries.dialectId, dialectIds), eq(schema.entries.status, 'active')),
    orderBy: desc(schema.entries.score),
    limit: 100,
    with: {
      dialect: true,
      links: { with: { word: true } },
    },
  })

  return {
    ...dialect,
    entries: entries.map(e => ({
      id: e.id, form: e.form, meaning: e.meaning, score: e.score,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      words: e.links.filter(l => l.status === 'active').map(l => ({ id: l.word.id, headword: l.word.headword })),
    })),
  }
})
