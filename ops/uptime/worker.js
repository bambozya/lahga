/**
 * Every five minutes Cloudflare runs `scheduled`. It fetches each target, and if
 * one fails it tries once more after fifteen seconds so a deploy in progress is
 * not an alarm. When the site goes from up to down, or from down back to up, one
 * email goes out through Brevo. In between, nothing: the state in KV is what
 * stops it from emailing every five minutes.
 *
 * Visiting the worker's own URL shows the current state as JSON.
 */

const TIMEOUT_MS = 20_000
const RETRY_AFTER_MS = 15_000

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(check(env))
  },
  async fetch(_request, env) {
    const state = (await env.STATE.get('state', 'json')) ?? { status: 'unknown' }
    return new Response(JSON.stringify(state, null, 2), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  },
}

async function check(env) {
  const targets = env.TARGETS.split(',').map((t) => t.trim()).filter(Boolean)
  let failure = await probeAll(targets)
  if (failure) {
    await sleep(RETRY_AFTER_MS)
    failure = await probeAll(targets)
  }

  const now = new Date().toISOString()
  const previous = (await env.STATE.get('state', 'json')) ?? { status: 'unknown' }
  const status = failure ? 'down' : 'up'
  const changed = previous.status !== status
  const state = {
    status,
    since: changed ? now : previous.since ?? now,
    lastCheck: now,
    lastError: failure ?? null,
  }
  await env.STATE.put('state', JSON.stringify(state))

  // The very first run after deploy only records the state; it does not alert.
  if (changed && previous.status !== 'unknown') {
    await alert(env, state, previous)
  }
  return state
}

/** Returns null when every target answers, otherwise one line saying what failed. */
async function probeAll(targets) {
  for (const url of targets) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'lahga-uptime (cloudflare worker)' },
        cf: { cacheTtl: 0 },
      })
      if (!res.ok) return `${url} answered ${res.status}`
      if (url.endsWith('/api/health')) {
        const body = await res.json().catch(() => null)
        if (!body || body.ok !== true) return `${url} did not answer {"ok":true}`
      }
    } catch (err) {
      return `${url}: ${err?.name === 'TimeoutError' ? 'no answer within 20 seconds' : String(err?.message ?? err)}`
    }
  }
  return null
}

async function alert(env, state, previous) {
  const down = state.status === 'down'
  const subject = down ? '⚠️ لهجة لا يستجيب' : '✅ لهجة عاد للعمل'
  const lines = down
    ? [
        'الموقع لا يستجيب من خارج الخادم.',
        '',
        `السبب: ${state.lastError}`,
        `الوقت: ${state.lastCheck}`,
        '',
        'تحقق من https://coolify.lahga.fyi',
      ]
    : [
        'الموقع يستجيب من جديد.',
        '',
        `كان متوقفاً منذ: ${previous.since ?? 'غير معروف'}`,
        `عاد في: ${state.lastCheck}`,
      ]
  const text = lines.join('\n')

  const m = env.EMAIL_FROM.match(/^(.*?)\s*<(.+)>$/)
  const sender = m ? { name: m[1], email: m[2] } : { email: env.EMAIL_FROM }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender,
      to: [{ email: env.ALERT_TO }],
      subject,
      textContent: text,
      htmlContent: `<pre dir="rtl" style="font-family:system-ui,sans-serif;font-size:16px;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    }),
  })
  if (!res.ok) console.error('alert email failed', res.status, await res.text().catch(() => ''))
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
