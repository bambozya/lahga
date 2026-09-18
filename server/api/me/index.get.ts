import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** The logged-in user's own account, for the settings page. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const providers = await db.select({ provider: schema.oauthAccounts.provider })
    .from(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, user.id))
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    role: user.role,
    emailVerified: !!user.emailVerifiedAt,
    hasPassword: !!user.passwordHash,
    providers: providers.map(p => p.provider),
    createdAt: user.createdAt,
  }
})
