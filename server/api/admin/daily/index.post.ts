import * as v from 'valibot'
import { and, eq, ne } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { readBody$ } from '../../../utils/validate'
import { normalizeArabic } from '../../../utils/contribute'
import { MIN_GROUPS, revealOrderFor, todayDate } from '../../../utils/daily'

/**
 * Sets (or swaps) the word for a future day of كلمة اليوم (docs/REACH.md,
 * Phase R3): curating a queue ahead of time, the way the plan asks for, so a
 * dud word can be replaced before it ever goes live. Only a date after today
 * — today's round may already be in progress for someone, and the day is
 * chosen the moment it starts if nothing was curated for it (server/utils/daily.ts).
 */
const Body = v.object({
  date: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صالح')),
  headword: v.pipe(v.string('الكلمة مطلوبة'), v.trim(), v.minLength(1, 'الكلمة مطلوبة'), v.maxLength(80)),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody$(event, Body)
  if (body.date <= todayDate()) {
    throw createError({ statusCode: 400, statusMessage: 'يمكن فقط تحديد كلمة ليوم قادم' })
  }
  const db = await useDb()

  const word = await db.query.words.findFirst({
    where: and(eq(schema.words.headwordNormalized, normalizeArabic(body.headword)), eq(schema.words.status, 'active')),
  })
  if (!word) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  const clash = await db.query.dailyPuzzles.findFirst({
    where: and(eq(schema.dailyPuzzles.wordId, word.id), ne(schema.dailyPuzzles.date, body.date)),
  })
  if (clash) throw createError({ statusCode: 409, statusMessage: `هذه الكلمة مُستخدمة بالفعل في لغز ${clash.date}` })

  const revealOrder = await revealOrderFor(db, word)
  if (revealOrder.length < MIN_GROUPS) {
    throw createError({ statusCode: 400, statusMessage: 'هذه الكلمة لا تملك اختلافاً كافياً بين اللهجات لتصلح للعبة' })
  }

  const [row] = await db.insert(schema.dailyPuzzles)
    .values({ date: body.date, wordId: word.id, revealOrder })
    .onConflictDoUpdate({ target: schema.dailyPuzzles.date, set: { wordId: word.id, revealOrder } })
    .returning()
  return { date: row!.date, word: { id: word.id, headword: word.headword, slug: word.slug } }
})
