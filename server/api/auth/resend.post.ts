/** Sends a fresh verification link to the logged-in user. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.emailVerifiedAt) return { ok: true, already: true }
  assertRateLimit(`resend:${user.id}`, 3, 60 * 60 * 1000)
  await sendVerificationEmail(user)
  return { ok: true }
})
