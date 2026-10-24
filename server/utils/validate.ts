import * as v from 'valibot'
import type { H3Event } from 'h3'
import { isArabicOnly } from '../../shared/utils/arabic'

/** Reads and validates the JSON body; a failure is a 400 with the first message in Arabic. */
export async function readBody$<T extends v.GenericSchema>(event: H3Event, schema: T): Promise<v.InferOutput<T>> {
  const body = await readBody(event).catch(() => null)
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'بيانات غير صالحة' })
  const result = v.safeParse(schema, body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.issues[0]?.message || 'بيانات غير صالحة' })
  }
  return result.output
}

export const email = v.pipe(
  v.string('البريد الإلكتروني مطلوب'),
  v.trim(),
  v.toLowerCase(),
  v.email('البريد الإلكتروني غير صالح'),
  v.maxLength(254, 'البريد الإلكتروني طويل جداً'),
)

export const password = v.pipe(
  v.string('كلمة المرور مطلوبة'),
  v.minLength(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  v.maxLength(200, 'كلمة المرور طويلة جداً'),
)

export const displayName = v.pipe(
  v.string('الاسم مطلوب'),
  v.trim(),
  v.minLength(2, 'الاسم قصير جداً'),
  v.maxLength(40, 'الاسم طويل جداً (40 حرفاً كحد أقصى)'),
  v.check(isArabicOnly, 'الاسم يجب أن يكون بالحروف العربية'),
)

export const bio = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(300, 'النبذة طويلة جداً (300 حرف كحد أقصى)'),
  v.check(isArabicOnly, 'النبذة يجب أن تكون بالحروف العربية'),
)

export const token = v.pipe(v.string('الرابط غير صالح'), v.regex(/^[a-f0-9]{64}$/, 'الرابط غير صالح'))

/**
 * A `?limit=` from the query: a whole number between 1 and `max`, or `fallback`
 * when it is absent.
 *
 * `Math.min(Number(limit) || 20, 50)` reads like a clamp and is not one. A
 * negative number is truthy and smaller than the cap, so it passed straight
 * through, and Drizzle leaves a negative LIMIT out of the SQL altogether —
 * `?limit=-5` answered with every row in the table instead of five.
 */
export function limitParam(raw: unknown, fallback: number, max: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    throw createError({ statusCode: 400, statusMessage: 'قيمة limit غير صالحة' })
  }
  return Math.min(n, max)
}

/**
 * A `?q=` from the query. Long terms are refused rather than trimmed: every
 * character costs trigram work on three indexes, and nobody searches for a
 * paragraph.
 */
export function searchTerm(raw: unknown, max = 100): string {
  if (typeof raw !== 'string') return ''
  if (raw.length > max) {
    throw createError({ statusCode: 400, statusMessage: 'نص البحث طويل جداً' })
  }
  return raw.trim()
}

/**
 * A numeric id from the route, as in /api/entries/12. Anything that is not a
 * positive whole number gets the route's own 404, the same answer as an id
 * that does not exist: passed on as NaN, it reached the database and came
 * back a 500 (and, since the error mails, an email).
 */
export function idParam(event: H3Event, notFound: string, name = 'id'): number {
  const id = Number(getRouterParam(event, name))
  if (!Number.isSafeInteger(id) || id < 1) throw createError({ statusCode: 404, statusMessage: notFound })
  return id
}

/**
 * A small counter a page sends about its own progress (?reveal=3, ?slot=2):
 * a whole number from `min` (1 unless said) to `max`, `fallback` when missing
 * or not a number. Quietly clamped rather than refused, because the only
 * sender is our own page, and an out-of-range value there is a stale tab.
 */
export function clampParam(raw: unknown, fallback: number, max: number, min = 1): number {
  if (raw === undefined || raw === null || raw === '') return Math.min(Math.max(fallback, min), max)
  const n = Math.trunc(Number(raw))
  if (!Number.isFinite(n)) return Math.min(Math.max(fallback, min), max)
  return Math.min(Math.max(n, min), max)
}
