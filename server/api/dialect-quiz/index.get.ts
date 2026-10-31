import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { ensureRound, groupNames } from '../../utils/dialectQuiz'
import { gameDate } from '../../utils/daily'
import { QUIZ_ROUNDS } from '../../../shared/config/rules'
import { clampParam } from '../../utils/validate'

/**
 * One of today's three rounds of «من أي لهجة؟»: the form and its MSA word
 * for context, and the four dialect names to choose from — the correct one
 * is never marked, only checked by POST .../guess. ?date= keeps the later
 * rounds on the day the first one was shown (gameDate).
 */
export default defineEventHandler(async (event) => {
  const { slot, date } = getQuery(event)
  const n = clampParam(slot, 1, QUIZ_ROUNDS)
  const db = await useDb()
  const round = await ensureRound(db, gameDate(date), n)

  const [entry, names] = await Promise.all([
    db.query.entries.findFirst({ where: eq(schema.entries.id, round.entryId) }),
    groupNames(db, round.choiceGroupIds),
  ])
  const word = await db.query.words.findFirst({ where: eq(schema.words.id, round.wordId) })
  if (!entry || !word) throw createError({ statusCode: 404, statusMessage: 'الجولة غير موجودة' })

  return {
    date: round.date, slot: n, total: QUIZ_ROUNDS,
    form: entry.formVocalized ?? entry.form,
    word: { headword: word.headword, definition: word.definition },
    choices: round.choiceGroupIds.map(id => ({ id, nameAr: names.get(id) ?? '' })),
  }
})
