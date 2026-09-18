/**
 * Transactional email through Brevo (https://developers.brevo.com).
 * Without BREVO_API_KEY (local development) the message is printed to the console
 * instead, links included, so the flows can be tested without an account.
 */
type Mail = { to: string; subject: string; text: string; html: string }

export async function sendEmail(mail: Mail): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM || 'لهجة <no-reply@lahga.fyi>'
  if (!apiKey) {
    console.log(`[lahga] email (not sent, no BREVO_API_KEY)\n  to: ${mail.to}\n  subject: ${mail.subject}\n  ${mail.text.replace(/\n/g, '\n  ')}`)
    return
  }
  const m = from.match(/^(.*?)\s*<(.+)>$/)
  const sender = m ? { name: m[1], email: m[2] } : { email: from }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: mail.to }], subject: mail.subject, textContent: mail.text, htmlContent: mail.html }),
  })
  if (!res.ok) {
    console.error('[lahga] email failed', res.status, await res.text().catch(() => ''))
    throw createError({ statusCode: 502, statusMessage: 'تعذر إرسال البريد الإلكتروني، حاول لاحقاً' })
  }
}

/** A small RTL Arabic template: one heading, one paragraph, one button. */
export function renderEmail(opts: { title: string; body: string; action: string; url: string }) {
  const text = `${opts.title}\n\n${opts.body}\n\n${opts.action}: ${opts.url}\n\nإن لم تطلب هذا فتجاهل الرسالة.`
  const html = `<!doctype html><html dir="rtl" lang="ar"><body style="font-family:system-ui,sans-serif;line-height:1.8;color:#15130f;background:#f6f3ec;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #ddd">
<h1 style="font-size:20px;margin:0 0 16px">${opts.title}</h1>
<p style="margin:0 0 24px">${opts.body}</p>
<p style="margin:0 0 24px"><a href="${opts.url}" style="display:inline-block;background:#15130f;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">${opts.action}</a></p>
<p style="font-size:13px;color:#666;margin:0">إن لم يعمل الزر فانسخ هذا الرابط: <br><span dir="ltr">${opts.url}</span></p>
<p style="font-size:13px;color:#666;margin:16px 0 0">إن لم تطلب هذا فتجاهل الرسالة.</p>
</div></body></html>`
  return { text, html }
}
