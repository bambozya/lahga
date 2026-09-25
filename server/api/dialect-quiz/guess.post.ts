import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { ensureRound, groupNames, SLOTS } from '../../utils/dialectQuiz'
import { todayDate } from '../../../shared/utils/daily'
import { assertRateLimit, clientIp } from '../../utils/rateLimit'

/**
 * A guess for one of today's three rounds of «من أي لهجة؟». One guess ends
 * the round either way — there is nothing to reveal gradually the way the
 * word game has, so the correct group is always returned, right or wrong.
 */
const Body = v.object({
  slot: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3)),
  groupId: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export default defineEventHandler(async (event) => {
  assertRateLimit(`dialect-quiz-guess:${clientIp(event)}`, 60, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const round = await ensureRound(db, todayDate(), body.slot)

  const [word, names] = await Promise.all([
    db.query.words.findFirst({ where: eq(schema.words.id, round.wordId) }),
    groupNames(db, [round.correctGroupId]),
  ])
  if (!word) throw createError({ statusCode: 500, statusMessage: 'تعذر تحميل الجولة' })

  return {
    correct: body.groupId === round.correctGroupId,
    correctGroupId: round.correctGroupId,
    correctNameAr: names.get(round.correctGroupId) ?? '',
    word: { headword: word.headword, slug: word.slug },
  }
})
