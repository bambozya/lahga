import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Proposals, pending by default (?status=approved|rejected for the decided ones). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const status = String(getQuery(event).status ?? 'pending') as 'pending' | 'approved' | 'rejected'
  const rows = await db.query.proposals.findMany({
    where: eq(schema.proposals.status, status),
    orderBy: desc(schema.proposals.createdAt),
    limit: 100,
    with: { author: true, decider: true },
  })
  return Promise.all(rows.map(async p => {
    const dialect = p.targetId ? await db.query.dialects.findFirst({ where: eq(schema.dialects.id, p.targetId) }) : null
    return {
      id: p.id, kind: p.kind, data: p.data, status: p.status, note: p.note, createdAt: p.createdAt, decidedAt: p.decidedAt,
      author: publicUser(p.author), decider: p.decider ? publicUser(p.decider) : null,
      dialect: dialect ? { id: dialect.id, slug: dialect.slug, nameAr: dialect.nameAr, descriptionAr: dialect.descriptionAr } : null,
    }
  }))
})
