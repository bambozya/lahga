import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, password } from '../../utils/validate'

/** Changes the password. Accounts that came from Google can set a first password without a current one. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody$(event, v.object({ current: v.optional(v.string()), password }))
  if (user.passwordHash) {
    if (!body.current || !await verifyPassword(user.passwordHash, body.current)) {
      throw createError({ statusCode: 400, statusMessage: 'كلمة المرور الحالية غير صحيحة' })
    }
  }
  const db = await useDb()
  await db.update(schema.users).set({ passwordHash: await hashPassword(body.password) }).where(eq(schema.users.id, user.id))
  return { ok: true }
})
