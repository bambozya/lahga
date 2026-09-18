import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, token, password } from '../../utils/validate'

/** Sets a new password from a reset link, confirms the email on the way, and logs the user in. */
export default defineEventHandler(async (event) => {
  assertRateLimit(`reset:${clientIp(event)}`, 10, 60 * 60 * 1000)
  const body = await readBody$(event, v.object({ token, password }))
  const userId = await consumeToken(body.token, 'reset')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'الرابط غير صالح أو انتهت صلاحيته' })

  const db = await useDb()
  const [user] = await db.update(schema.users)
    .set({ passwordHash: await hashPassword(body.password), emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, userId)).returning()
  if (!user || user.deletedAt) throw createError({ statusCode: 400, statusMessage: 'الحساب غير موجود' })

  await login(event, user)
  return { ok: true }
})
