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

  const { user } = await getUserSession(event)
  const mine = await myVotes(db, user?.id, 'entry', entries.map(e => e.id))
  const lastApproved = await db.query.proposals.findFirst({
    where: and(eq(schema.proposals.kind, 'dialect_description'), eq(schema.proposals.targetId, dialect.id), eq(schema.proposals.status, 'approved')),
    orderBy: desc(schema.proposals.decidedAt), with: { author: true },
  })
  return {
    ...dialect,
    descriptionBy: lastApproved ? publicUser(lastApproved.author) : null,
    entries: entries.map(e => ({
      id: e.id, form: e.form, meaning: e.meaning, score: e.score, myVote: mine[e.id] ?? 0, createdBy: e.createdBy,
      dialect: { slug: e.dialect.slug, nameAr: e.dialect.nameAr },
      words: e.links.filter(l => l.status === 'active').map(l => ({ id: l.word.id, headword: l.word.headword })),
    })),
  }
})
