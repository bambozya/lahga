/**
 * Emails the site owner when the server fails (docs/ROADMAP.md A3), so a
 * failure at night is found by an inbox rather than by a visitor. No service
 * to run: the same Brevo account the sign-up mails go through.
 *
 * Only real failures: a 5xx or an error nobody caught. A 404, a refused form
 * or a rate limit is the site working as intended.
 *
 * Quiet by design. One mail per distinct error per hour, and at most
 * MAX_PER_HOUR in all, so a database outage that fails every request sends a
 * handful of mails, not thousands; the next mail for an error says how many
 * repeats were held back. Sending never delays the response, and a mail that
 * fails is logged, never retried, so a Brevo outage cannot feed on itself.
 *
 * Goes to ERROR_EMAIL, else CONTACT_EMAIL (where the contact form already
 * writes). Neither set, or local development: nothing is sent; the error is
 * in the console anyway.
 */
const HOUR = 60 * 60 * 1000
const MAX_PER_HOUR = 10
/** Distinct errors remembered at once; the oldest is forgotten first. */
const MAX_KEYS = 200

type Seen = { lastSent: number, held: number }
const seen = new Map<string, Seen>()
let windowStart = 0
let sentInWindow = 0

export default defineNitroPlugin((nitro) => {
  if (import.meta.dev) return
  const to = process.env.ERROR_EMAIL || process.env.CONTACT_EMAIL
  if (!to) return

  nitro.hooks.hook('error', (error, { event }) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500) return

    // The message and the first line of the stack that points into our own
    // code: the same bug from two pages is one error, two different bugs
    // with the same message are two.
    const frame = error.stack?.split('\n').find(l => l.includes('/server/') || l.includes('/app/'))?.trim() ?? ''
    const key = `${error.message}|${frame}`.slice(0, 500)

    const now = Date.now()
    const entry = seen.get(key)
    if (entry && now - entry.lastSent < HOUR) {
      entry.held++
      return
    }
    if (now - windowStart > HOUR) {
      windowStart = now
      sentInWindow = 0
    }
    if (sentInWindow >= MAX_PER_HOUR) {
      if (entry) entry.held++
      return
    }
    sentInWindow++

    const held = entry?.held ?? 0
    seen.delete(key) // re-insert at the end: Map order is the eviction order
    seen.set(key, { lastSent: now, held: 0 })
    if (seen.size > MAX_KEYS) seen.delete(seen.keys().next().value!)

    const where = event ? `${event.method} ${event.path}` : '(no request)'
    const stack = (error.stack ?? error.message).split('\n').slice(0, 15).join('\n')
    const head = [`${status} on ${where}`, `at ${new Date(now).toISOString()}`]
    if (held) head.push(`${held} more like it in the last hour were not mailed.`)
    const text = `${head.join('\n')}\n\n${stack}`
    const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

    sendEmail({
      to,
      subject: `[لهجة] خطأ في الخادم: ${error.message.slice(0, 80)}`,
      text,
      html: `<pre style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap" dir="ltr">${esc(text)}</pre>`,
    }).catch(e => console.error('[lahga] error mail failed', e?.message ?? e))
  })
})
