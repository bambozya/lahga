import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, token } from '../../utils/validate'

/** Confirms the email behind a verification link. Works whether or not the user is logged in. */
export default defineEventHandler(async (event) => {
  assertRateLimit(`verify:${clientIp(event)}`, 20, 60 * 60 * 1000)
  const body = await readBody$(event, v.object({ token }))
  const userId = await consumeToken(body.token, 'verify')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'الرابط غير صالح أو انتهت صلاحيته' })

  const db = await useDb()
  const [user] = await db.update(schema.users).set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, userId)).returning()

  const session = await getUserSession(event)
  if (session.user?.id === userId) await refreshSession(event, user!)
  return { ok: true }
})
