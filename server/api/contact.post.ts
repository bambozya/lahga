import * as v from 'valibot'
import { readBody$ } from '../utils/validate'

/** The contact form: forwards the message by email to the site owner. */
const Body = v.object({
  name: v.pipe(v.string('الاسم مطلوب'), v.trim(), v.minLength(2, 'الاسم قصير جداً'), v.maxLength(80, 'الاسم طويل جداً')),
  email: v.pipe(v.string('البريد الإلكتروني مطلوب'), v.trim(), v.email('البريد الإلكتروني غير صالح'), v.maxLength(254)),
  subject: v.pipe(v.string('الموضوع مطلوب'), v.trim(), v.minLength(2, 'الموضوع قصير جداً'), v.maxLength(150, 'الموضوع طويل جداً')),
  message: v.pipe(v.string('الرسالة مطلوبة'), v.trim(), v.minLength(10, 'الرسالة قصيرة جداً'), v.maxLength(4000, 'الرسالة طويلة جداً')),
  // Honeypot: real people leave it empty; bots that fill every field are dropped silently.
  website: v.optional(v.string()),
})

export default defineEventHandler(async (event) => {
  assertRateLimit(`contact:${clientIp(event)}`, 5, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  if (body.website) return { ok: true }
  const to = process.env.CONTACT_EMAIL
  if (!to) throw createError({ statusCode: 503, statusMessage: 'نموذج الاتصال غير مفعّل بعد؛ راسلنا على info@lahga.fyi' })
  const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  await sendEmail({
    to,
    subject: `[لهجة] ${body.subject}`,
    text: `من: ${body.name} <${body.email}>\n\n${body.message}`,
    html: `<div dir="rtl" lang="ar" style="font-family:system-ui,sans-serif;line-height:1.8"><p>من: ${esc(body.name)} &lt;<span dir="ltr">${esc(body.email)}</span>&gt;</p><p style="white-space:pre-wrap">${esc(body.message)}</p></div>`,
  })
  return { ok: true }
})
