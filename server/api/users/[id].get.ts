import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { idParam } from '../../utils/validate'

/** Public profile: only what anyone may see. */
export default defineEventHandler(async (event) => {
  const id = idParam(event, 'المستخدم غير موجود')
  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id), with: { expertIn: { with: { dialect: true } } } })
  if (!user || user.deletedAt) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  return {
    id: user.id, displayName: user.displayName, bio: user.bio, role: user.role, createdAt: user.createdAt,
    // Public on purpose: a reader weighing an expert's confirmation should see whose it is.
    expertIn: user.expertIn.map(x => ({ slug: x.dialect.slug, nameAr: x.dialect.nameAr })),
  }
})
