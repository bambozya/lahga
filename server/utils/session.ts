import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../db'

/** What the sealed session cookie carries. Keep it small: it travels with every request. */
export type SessionUser = {
  id: number
  displayName: string
  role: 'user' | 'moderator' | 'admin'
  emailVerified: boolean
}

export function toSessionUser(u: typeof schema.users.$inferSelect): SessionUser {
  return { id: u.id, displayName: u.displayName, role: u.role, emailVerified: !!u.emailVerifiedAt }
}

/** Logs the user in: writes the session cookie and stamps last_seen_at. */
export async function login(event: H3Event, user: typeof schema.users.$inferSelect) {
  const db = await useDb()
  await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, user.id))
  await replaceUserSession(event, { user: toSessionUser(user), loggedInAt: Date.now() })
}

/** The current user's full row, or a 401. Deleted accounts count as logged out. */
export async function requireUser(event: H3Event) {
  const { user } = await getUserSession(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'يجب تسجيل الدخول' })
  const db = await useDb()
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) })
  if (!row || row.deletedAt) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'يجب تسجيل الدخول' })
  }
  return row
}

/** Refreshes the cookie after the user's row changed (name, verification, …). */
export async function refreshSession(event: H3Event, user: typeof schema.users.$inferSelect) {
  const session = await getUserSession(event)
  await replaceUserSession(event, { ...session, user: toSessionUser(user) })
}
