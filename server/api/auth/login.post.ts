import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, email } from '../../utils/validate'
import { RATE_LIMITS } from '../../../shared/config/rules'

const Body = v.object({ email, password: v.string('كلمة المرور مطلوبة') })
const WRONG = () => createError({ statusCode: 401, statusMessage: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })

export default defineEventHandler(async (event) => {
  assertRateLimit(`login:${clientIp(event)}`, RATE_LIMITS.loginPerIp)
  const body = await readBody$(event, Body)
  assertRateLimit(`login:${body.email}`, RATE_LIMITS.loginPerEmail)

  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) })
  if (!user || user.deletedAt || !user.passwordHash) throw WRONG()
  if (!await verifyPassword(user.passwordHash, body.password)) throw WRONG()
  if (user.bannedAt) throw createError({ statusCode: 403, statusMessage: 'حسابك موقوف' + (user.banReason ? ': ' + user.banReason : '') })

  await login(event, user)
  return { ok: true }
})
