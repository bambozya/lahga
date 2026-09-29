import { desc, ilike, or } from 'drizzle-orm'
import { useDb, schema } from '../../../db'

/** Users, newest first, or a search by name or email. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const q = String(getQuery(event).q ?? '').trim()
  const rows = await db.query.users.findMany({
    where: q ? or(ilike(schema.users.displayName, `%${q}%`), ilike(schema.users.email, `%${q}%`)) : undefined,
    orderBy: desc(schema.users.createdAt),
    limit: 100,
    with: { expertIn: { with: { dialect: true } } },
  })
  return rows.map(u => ({
    id: u.id, displayName: u.displayName, email: u.email, role: u.role, verified: !!u.emailVerifiedAt,
    createdAt: u.createdAt, lastSeenAt: u.lastSeenAt, deleted: !!u.deletedAt, bannedAt: u.bannedAt, banReason: u.banReason,
    expertIn: u.expertIn.map(x => ({ slug: x.dialect.slug, nameAr: x.dialect.nameAr })),
  }))
})
