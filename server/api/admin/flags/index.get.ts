import { desc, eq, isNull, isNotNull } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Flags, open by default (?status=resolved for the handled ones), newest first, with a preview of the target. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const resolved = getQuery(event).status === 'resolved'
  const rows = await db.query.flags.findMany({
    where: resolved ? isNotNull(schema.flags.resolvedAt) : isNull(schema.flags.resolvedAt),
    orderBy: desc(schema.flags.createdAt),
    limit: 100,
    with: { reporter: true },
  })
  return Promise.all(rows.map(async f => ({
    id: f.id, targetType: f.targetType, targetId: f.targetId, reason: f.reason, comment: f.comment, createdAt: f.createdAt,
    resolvedAt: f.resolvedAt, resolution: f.resolution,
    reporter: publicUser(f.reporter),
    target: await describeTarget(db, f.targetType, f.targetId),
  })))
})
