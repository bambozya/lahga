import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'

type Purpose = 'verify' | 'reset'
const TTL_MS = 60 * 60 * 1000 // one hour

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

/** Creates a single-use token for the user and returns the plain value for the link. */
export async function issueToken(userId: number, purpose: Purpose): Promise<string> {
  const db = await useDb()
  const token = randomBytes(32).toString('hex')
  // Older unused tokens of the same purpose stop working: only the newest link counts.
  await db.update(schema.emailTokens).set({ usedAt: new Date() })
    .where(and(eq(schema.emailTokens.userId, userId), eq(schema.emailTokens.purpose, purpose), isNull(schema.emailTokens.usedAt)))
  await db.insert(schema.emailTokens).values({ userId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS) })
  return token
}

/** Consumes the token: returns its user id, or null if unknown, used or expired. */
export async function consumeToken(token: string, purpose: Purpose): Promise<number | null> {
  const db = await useDb()
  const [row] = await db.update(schema.emailTokens).set({ usedAt: new Date() })
    .where(and(
      eq(schema.emailTokens.tokenHash, hash(token)),
      eq(schema.emailTokens.purpose, purpose),
      isNull(schema.emailTokens.usedAt),
      gt(schema.emailTokens.expiresAt, new Date()),
    ))
    .returning({ userId: schema.emailTokens.userId })
  return row?.userId ?? null
}

export function siteUrl(): string {
  return (process.env.NUXT_PUBLIC_SITE_URL || useRuntimeConfig().public.siteUrl || 'https://lahga.fyi').replace(/\/$/, '')
}

export async function sendVerificationEmail(user: { id: number; email: string }) {
  const token = await issueToken(user.id, 'verify')
  const url = `${siteUrl()}/verify?token=${token}`
  await sendEmail({ to: user.email, subject: 'تأكيد بريدك الإلكتروني في لهجة', ...renderEmail({
    title: 'أهلاً بك في لهجة',
    body: 'اضغط الزر لتأكيد بريدك الإلكتروني. الرابط صالح لمدة ساعة.',
    action: 'تأكيد البريد',
    url,
  }) })
}

export async function sendResetEmail(user: { id: number; email: string }) {
  const token = await issueToken(user.id, 'reset')
  const url = `${siteUrl()}/reset?token=${token}`
  await sendEmail({ to: user.email, subject: 'إعادة تعيين كلمة المرور في لهجة', ...renderEmail({
    title: 'إعادة تعيين كلمة المرور',
    body: 'اضغط الزر لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة.',
    action: 'اختيار كلمة مرور جديدة',
    url,
  }) })
}
