import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, email } from '../../utils/validate'

/** Always answers ok, so the form cannot be used to find out which emails exist. */
export default defineEventHandler(async (event) => {
  assertRateLimit(`reset-request:${clientIp(event)}`, 5, 60 * 60 * 1000)
  const body = await readBody$(event, v.object({ email }))
  assertRateLimit(`reset-request:${body.email}`, 3, 60 * 60 * 1000)

  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) })
  if (user && !user.deletedAt) await sendResetEmail(user)
  return { ok: true }
})
