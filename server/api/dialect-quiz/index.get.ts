import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { ensureRound, groupNames, SLOTS } from '../../utils/dialectQuiz'
import { todayDate } from '../../../shared/utils/daily'

/**
 * One of today's three rounds of «من أي لهجة؟»: the form and its MSA word
 * for context, and the four dialect names to choose from — the correct one
 * is never marked, only checked by POST .../guess.
 */
export default defineEventHandler(async (event) => {
  const { slot } = getQuery(event)
  const n = Math.min(Math.max(Number(slot) || 1, 1), SLOTS)
  const db = await useDb()
  const round = await ensureRound(db, todayDate(), n)

  const [entry, names] = await Promise.all([
    db.query.entries.findFirst({ where: eq(schema.entries.id, round.entryId) }),
    groupNames(db, round.choiceGroupIds),
  ])
  const word = await db.query.words.findFirst({ where: eq(schema.words.id, round.wordId) })
  if (!entry || !word) throw createError({ statusCode: 404, statusMessage: 'الجولة غير موجودة' })

  return {
    date: round.date, slot: n, total: SLOTS,
    form: entry.form,
    word: { headword: word.headword, definition: word.definition },
    choices: round.choiceGroupIds.map(id => ({ id, nameAr: names.get(id) ?? '' })),
  }
})
