import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** Soft-deletes an entry and its links. Refused if others added examples or anyone voted. */
export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, id), with: { examples: true, links: true } })
  if (!entry || entry.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'المدخل غير موجود' })
  assertOwner(entry, user)

  const othersBuiltOnIt = entry.examples.some(x => x.status === 'active' && x.createdBy !== entry.createdBy)
    || entry.links.some(l => l.status === 'active' && l.createdBy !== entry.createdBy)
  if (user.role !== 'admin' && (othersBuiltOnIt || await voteCount(db, 'entry', id) > 0)) {
    throw createError({ statusCode: 409, statusMessage: 'لا يمكن حذف المدخل بعد أن بنى عليه آخرون' })
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.entries).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.entries.id, id))
    await tx.update(schema.wordEntryLinks).set({ status: 'deleted', updatedAt: new Date() }).where(eq(schema.wordEntryLinks.entryId, id))
    await recordRevision(tx, 'entry', id, { status: 'deleted' }, user.id)
  })
  return { ok: true }
})
