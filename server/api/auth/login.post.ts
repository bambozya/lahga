import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, email } from '../../utils/validate'

const Body = v.object({ email, password: v.string('كلمة المرور مطلوبة') })
const WRONG = () => createError({ statusCode: 401, statusMessage: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })

export default defineEventHandler(async (event) => {
  assertRateLimit(`login:${clientIp(event)}`, 20, 15 * 60 * 1000)
  const body = await readBody$(event, Body)
  assertRateLimit(`login:${body.email}`, 10, 15 * 60 * 1000)

  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) })
  if (!user || user.deletedAt || !user.passwordHash) throw WRONG()
  if (!await verifyPassword(user.passwordHash, body.password)) throw WRONG()

  await login(event, user)
  return { ok: true }
})
