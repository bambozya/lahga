import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, email } from '../../utils/validate'
import { RATE_LIMITS } from '../../../shared/config/rules'

/** Always answers ok, so the form cannot be used to find out which emails exist. */
export default defineEventHandler(async (event) => {
  assertRateLimit(`reset-request:${clientIp(event)}`, RATE_LIMITS.resetRequestPerIp)
  const body = await readBody$(event, v.object({ email }))
  assertRateLimit(`reset-request:${body.email}`, RATE_LIMITS.resetRequestPerEmail)

  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) })
  if (user && !user.deletedAt) await sendResetEmail(user)
  return { ok: true }
})
