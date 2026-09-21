import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, email, password, displayName } from '../../utils/validate'

const Body = v.object({ email, password, displayName, turnstile: v.optional(v.string()) })

export default defineEventHandler(async (event) => {
  assertRateLimit(`register:${clientIp(event)}`, 5, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  await assertTurnstile(event, body.turnstile)

  const db = await useDb()
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'هذا البريد الإلكتروني مسجل بالفعل' })
  }

  const [user] = await db.insert(schema.users).values({
    email: body.email,
    displayName: body.displayName,
    passwordHash: await hashPassword(body.password),
  }).returning()

  // The account exists from here on. If the mail cannot go out, the visitor is still
  // logged in and can ask for a new link at /verify; failing here would leave them
  // with an error now and «مسجل بالفعل» on the second try.
  const mailSent = await sendVerificationEmail(user!).then(() => true, (e) => {
    console.error('[lahga] verification email failed at registration', e)
    return false
  })
  await login(event, user!)
  return { ok: true, mailSent }
})
