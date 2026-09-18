import { and, eq, ne, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * Soft-deletes a word. Refused once other people have built on it: an entry or
 * example by someone else linked to it, or any vote. The author's own entries that
 * exist only for this word go with it; entries linked elsewhere stay.
 */
export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const word = await db.query.words.findFirst({
    where: eq(schema.words.id, id),
    with: { links: { with: { entry: { with: { examples: true, links: true } } } } },
  })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  assertOwner(word, user)

  const links = word.links.filter(l => l.status === 'active' && l.entry.status === 'active')
  const isAdmin = user.role === 'admin'
  const othersBuiltOnIt = links.some(l =>
    l.createdBy !== word.createdBy
    || l.entry.createdBy !== word.createdBy
    || l.entry.examples.some(x => x.status === 'active' && x.createdBy !== word.createdBy))
  if (!isAdmin && (othersBuiltOnIt || await voteCount(db, 'word', id) > 0)) {
    throw createError({ statusCode: 409, statusMessage: 'لا يمكن حذف الكلمة بعد أن أضاف إليها آخرون أو صوّتوا عليها' })
  }

  await db.transaction(async (tx) => {
    await tx.update(schema.words).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.words.id, id))
    await tx.update(schema.wordEntryLinks).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.wordEntryLinks.wordId, id))
    for (const l of links) {
      const linkedElsewhere = l.entry.links.some(o => o.status === 'active' && o.wordId !== id)
      if (!linkedElsewhere && l.entry.createdBy === word.createdBy) {
        await tx.update(schema.entries).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.entries.id, l.entry.id))
      }
    }
    await recordRevision(tx, 'word', id, { status: 'deleted' }, user.id)
  })
  return { ok: true }
})
