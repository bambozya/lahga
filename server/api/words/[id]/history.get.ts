import { and, eq, inArray, or, desc } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Every revision of a word and of the entries and examples on its page, newest first. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const word = await db.query.words.findFirst({
    where: eq(schema.words.id, id),
    with: { links: { with: { entry: { with: { examples: true } } } } },
  })
  if (!word || word.status === 'deleted') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  const entryIds = word.links.map(l => l.entry.id)
  const exampleIds = word.links.flatMap(l => l.entry.examples.map(x => x.id))
  const conds = [and(eq(schema.revisions.targetType, 'word'), eq(schema.revisions.targetId, id))]
  if (entryIds.length) conds.push(and(eq(schema.revisions.targetType, 'entry'), inArray(schema.revisions.targetId, entryIds)))
  if (exampleIds.length) conds.push(and(eq(schema.revisions.targetType, 'example'), inArray(schema.revisions.targetId, exampleIds)))

  const rows = await db.query.revisions.findMany({
    where: or(...conds),
    orderBy: desc(schema.revisions.createdAt),
    with: { author: true },
    limit: 200,
  })
  return {
    word: { id: word.id, headword: word.headword },
    revisions: rows.map(r => ({
      id: r.id, targetType: r.targetType, targetId: r.targetId, revisionNo: r.revisionNo, data: r.data,
      reason: r.reason, createdAt: r.createdAt,
      author: r.author && !r.author.deletedAt ? { id: r.author.id, displayName: r.author.displayName } : { id: null, displayName: 'مستخدم محذوف' },
    })),
  }
})
