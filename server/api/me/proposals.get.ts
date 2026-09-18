import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** The caller's own proposals and what became of them. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const rows = await db.query.proposals.findMany({ where: eq(schema.proposals.authorId, user.id), orderBy: desc(schema.proposals.createdAt), limit: 50 })
  return Promise.all(rows.map(async p => ({
    id: p.id, kind: p.kind, status: p.status, note: p.note, createdAt: p.createdAt, decidedAt: p.decidedAt, data: p.data,
    dialect: p.targetId ? await db.query.dialects.findFirst({ where: eq(schema.dialects.id, p.targetId), columns: { slug: true, nameAr: true } }) : null,
  })))
})
