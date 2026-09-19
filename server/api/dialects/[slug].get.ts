import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { entryCounts, MIN_ENTRIES } from './index.get'

/**
 * One dialect with the entries tagged with it or any of its sub-dialects. The
 * sub-dialects it names are the ones that have words; an empty one is not
 * advertised, though its own page still answers (see index.get).
 * ?random=1 draws them at random instead of best-first: what the dialect page
 * shows, and what its shuffle button asks for again. ?limit= caps the draw.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const { random, limit } = getQuery(event)
  const db = await useDb()

  const dialect = await db.query.dialects.findFirst({
    where: eq(schema.dialects.slug, slug),
    with: { parent: true, children: true },
  })
  if (!dialect) throw createError({ statusCode: 404, statusMessage: 'اللهجة غير موجودة' })

  // Every child counts when gathering the words — the group page shows what its
  // sub-dialects hold — but only the ones that hold something are named on it.
  const dialectIds = [dialect.id, ...dialect.children.map(c => c.id)]
  const filled = await entryCounts(db)
  const children = dialect.children.filter(c => c.active === 1 && (filled.get(c.id) ?? 0) >= MIN_ENTRIES)
  const inDialect = and(inArray(schema.entries.dialectId, dialectIds), eq(schema.entries.status, 'active'))
  const entries = await db.query.entries.findMany({
    where: inDialect,
    orderBy: random ? sql`random()` : desc(schema.entries.score),
    limit: Math.min(Number(limit) || 100, 100),
    with: {
      dialect: true,
      links: { with: { word: true } },
    },
  })
  // The page draws its words at random, so the shown ones cannot carry the meta
  // description: that would rewrite it on every crawl. The best-supported few
  // are asked for separately and stay the same from one visit to the next.
  const topForms = await db.select({ form: schema.entries.form }).from(schema.entries)
    .where(inDialect).orderBy(desc(schema.entries.score), schema.entries.id).limit(6)

  const { user } = await getUserSession(event)
  const mine = await myVotes(db, user?.id, 'entry', entries.map(e => e.id))
  const lastApproved = await db.query.proposals.findFirst({
    where: and(eq(schema.proposals.kind, 'dialect_description'), eq(schema.proposals.targetId, dialect.id), eq(schema.proposals.status, 'approved')),
    orderBy: desc(schema.proposals.decidedAt), with: { author: true },
  })
  return {
    ...dialect,
    children,
    descriptionBy: lastApproved ? publicUser(lastApproved.author) : null,
    topForms: topForms.map(f => f.form),
    entries: entries.map(e => ({
      id: e.id, form: e.form, meaning: e.meaning, score: e.score, myVote: mine[e.id] ?? 0, createdBy: e.createdBy,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      words: e.links.filter(l => l.status === 'active').map(l => ({ id: l.word.id, headword: l.word.headword })),
    })),
  }
})
