import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'

/**
 * Deletes the account. The row is kept and anonymised so the user's words stay
 * attributed to "a deleted user" rather than vanishing; everything personal goes.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody$(event, v.object({ password: v.optional(v.string()) }))
  if (user.passwordHash && (!body.password || !await verifyPassword(user.passwordHash, body.password))) {
    throw createError({ statusCode: 400, statusMessage: 'كلمة المرور غير صحيحة' })
  }
  const db = await useDb()
  await db.transaction(async (tx) => {
    await tx.delete(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, user.id))
    await tx.delete(schema.emailTokens).where(eq(schema.emailTokens.userId, user.id))
    await tx.update(schema.users).set({
      email: `deleted-${user.id}@lahga.invalid`,
      displayName: 'مستخدم محذوف',
      passwordHash: null,
      emailVerifiedAt: null,
      avatarUrl: null,
      bio: null,
      deletedAt: new Date(),
    }).where(eq(schema.users.id, user.id))
  })
  await clearUserSession(event)
  return { ok: true }
})
