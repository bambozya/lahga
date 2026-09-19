import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../db'

const SYSTEM_EMAIL = 'system@lahga.invalid'

/** The account that owns imported content, created on first use. */
export async function systemUserId(db: Awaited<ReturnType<typeof useDb>>) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, SYSTEM_EMAIL) })
  if (existing) return existing.id
  const [u] = await db.insert(schema.users).values({
    email: SYSTEM_EMAIL, displayName: 'لهجة', emailVerifiedAt: new Date(),
    bio: 'حساب الموقع: المحتوى الأول الذي بدأ به القاموس.',
  }).returning()
  return u!.id
}

/**
 * Besides a logged-in admin, the bulk endpoints accept a bearer token equal to
 * IMPORT_TOKEN from the environment, so seed files can be loaded or retired
 * from a script. With the token, actions are logged under the system account.
 */
export async function requireImporter(event: H3Event) {
  const token = process.env.IMPORT_TOKEN
  const auth = getHeader(event, 'authorization') || ''
  if (token && token.length >= 32 && auth === `Bearer ${token}`) return null
  return requireAdmin(event)
}
