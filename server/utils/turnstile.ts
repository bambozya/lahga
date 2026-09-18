import type { H3Event } from 'h3'

/**
 * Cloudflare Turnstile check for the registration form.
 * Without NUXT_TURNSTILE_SECRET_KEY (local development) the check is skipped.
 */
export async function assertTurnstile(event: H3Event, token: unknown) {
  const secret = process.env.NUXT_TURNSTILE_SECRET_KEY
  if (!secret) return
  if (typeof token !== 'string' || !token) {
    throw createError({ statusCode: 400, statusMessage: 'يرجى إكمال التحقق من أنك لست روبوتاً' })
  }
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: clientIp(event) }),
  })
  const data = await res.json().catch(() => ({})) as { success?: boolean }
  if (!data.success) {
    throw createError({ statusCode: 400, statusMessage: 'فشل التحقق، حاول مرة أخرى' })
  }
}
