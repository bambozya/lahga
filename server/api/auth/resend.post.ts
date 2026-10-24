import { RATE_LIMITS } from '../../../shared/config/rules'
/** Sends a fresh verification link to the logged-in user. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.emailVerifiedAt) return { ok: true, already: true }
  assertRateLimit(`resend:${user.id}`, RATE_LIMITS.resendVerification)
  await sendVerificationEmail(user)
  return { ok: true }
})
