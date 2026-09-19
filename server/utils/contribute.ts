import type { H3Event } from 'h3'
import * as v from 'valibot'
import { and, eq, sql } from 'drizzle-orm'
import { useDb, schema, type Db } from '../db'
import { isArabicOnly, normalizeArabic } from '../../shared/utils/arabic'

type User = typeof schema.users.$inferSelect
type Target = 'word' | 'entry' | 'link' | 'example'
/** A transaction handle or the plain database: both run the same queries. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0] | Db

const WEEK = 7 * 24 * 60 * 60 * 1000

/** A logged-in user with a confirmed email, within the contribution limits. */
export async function requireContributor(event: H3Event): Promise<User> {
  const user = await requireUser(event)
  if (!user.emailVerifiedAt) {
    throw createError({ statusCode: 403, statusMessage: 'أكّد بريدك الإلكتروني أولاً لتتمكن من الإضافة' })
  }
  assertRateLimit(`contrib:${user.id}`, 20, 60 * 60 * 1000)
  if (Date.now() - new Date(user.createdAt).getTime() < WEEK) {
    assertRateLimit(`contrib-new:${user.id}`, 30, 24 * 60 * 60 * 1000)
  }
  return user
}

/** Users edit and delete only their own rows; admins may touch anything. */
export function assertOwner(row: { createdBy: number | null }, user: User) {
  if (user.role === 'admin') return
  if (row.createdBy !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'يمكنك تعديل ما أضفته أنت فقط' })
  }
}

/**
 * Does a line say nothing but the word it hangs under? «أخ» defined as «الأخ»,
 * or the Egyptian form «عربية» glossed «السيارة» on the page of سيارة: text that
 * repeats its own heading is furniture, not a definition. Both fields are
 * optional, so the honest thing is to leave them empty. The definite article,
 * the usual spelling drift and a trailing stop do not count as a difference.
 */
export function echoesWord(text: string | null | undefined, ...words: (string | null | undefined)[]) {
  if (!text) return false
  const bare = (s: string) => normalizeArabic(s).replace(/[.،؛:!؟\s]+$/g, '').replace(/^(ال|لل)/, '').replace(/\s+/g, ' ').trim()
  const t = bare(text)
  return !!t && words.some(w => w && bare(w) === t)
}

/** Writes the next revision for a row. `data` is the content after the change. */
export async function recordRevision(tx: Tx, targetType: Target, targetId: number, data: Record<string, unknown>, authorId: number, reason?: string | null) {
  const [row] = await tx.select({ n: sql<number>`coalesce(max(${schema.revisions.revisionNo}), 0)` })
    .from(schema.revisions)
    .where(and(eq(schema.revisions.targetType, targetType), eq(schema.revisions.targetId, targetId)))
  await tx.insert(schema.revisions).values({ targetType, targetId, revisionNo: Number(row?.n ?? 0) + 1, data, authorId, reason: reason || null })
}

/** How many votes a row has; a row with votes is no longer only its author's. */
export async function voteCount(tx: Tx, targetType: Target, targetId: number): Promise<number> {
  const [row] = await tx.select({ n: sql<number>`count(*)` }).from(schema.votes)
    .where(and(eq(schema.votes.targetType, targetType), eq(schema.votes.targetId, targetId)))
  return Number(row?.n ?? 0)
}

/** Resolves a dialect slug to its row, or a 400. */
export async function findDialect(tx: Tx, slug: string) {
  const dialect = await tx.query.dialects.findFirst({ where: and(eq(schema.dialects.slug, slug), eq(schema.dialects.active, 1)) })
  if (!dialect) throw createError({ statusCode: 400, statusMessage: 'اللهجة غير معروفة' })
  return dialect
}

export { normalizeArabic }

// ---------- field validators (all Arabic script) ----------

const arabic = (label: string, min: number, max: number) => v.pipe(
  v.string(`${label} مطلوب`),
  v.trim(),
  v.minLength(min, min <= 1 ? `${label} مطلوب` : `${label} قصير جداً`),
  v.maxLength(max, `${label} طويل جداً (${max} حرفاً كحد أقصى)`),
  v.check(isArabicOnly, `${label} يجب أن يكون بالحروف العربية`),
)
const optionalArabic = (label: string, max: number) => v.optional(v.pipe(
  v.string(), v.trim(), v.maxLength(max, `${label} طويل جداً (${max} حرفاً كحد أقصى)`),
  v.check(isArabicOnly, `${label} يجب أن يكون بالحروف العربية`),
))

export const fields = {
  headword: arabic('الكلمة بالفصحى', 1, 80),
  // Optional: «ماء» needs no gloss, and demanding one turns a word somebody
  // wanted to add into a form they abandon.
  definition: optionalArabic('التعريف', 600),
  kind: v.optional(v.picklist(['word', 'phrase', 'proverb'], 'النوع غير معروف'), 'word'),
  dialect: v.pipe(v.string('اللهجة مطلوبة'), v.regex(/^[a-z0-9-]{2,60}$/, 'اللهجة غير معروفة')),
  form: arabic('الكلمة باللهجة', 1, 80),
  // Optional: the MSA headword already defines the sense (see entries.meaning).
  meaning: optionalArabic('المعنى', 400),
  notes: optionalArabic('الملاحظات', 400),
  text: arabic('المثال', 3, 400),
  gloss: optionalArabic('شرح المثال', 400),
  reason: optionalArabic('سبب التعديل', 200),
  id: v.pipe(v.number('المعرّف مطلوب'), v.integer(), v.minValue(1)),
}
