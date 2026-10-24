import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { ensurePuzzle, gameDate, isCorrectGuess, visibleRevealOrder } from '../../utils/daily'
import { puzzleNumber } from '../../../shared/utils/daily'
import { assertRateLimit, clientIp } from '../../utils/rateLimit'
import { RATE_LIMITS, REVEALS } from '../../../shared/config/rules'

/**
 * A guess against the day's puzzle (docs/REACH.md, Phase R3) — the day the
 * page says it is showing, today or yesterday (gameDate). Right or wrong,
 * the response says so; wrong and there is another reveal left says what it
 * is; wrong (or a pass, sent as an empty guess) with nothing left to reveal
 * ends the round and returns the answer, same as a correct guess does.
 */
const Body = v.object({
  guess: v.pipe(v.string(), v.trim(), v.maxLength(80)),
  reveal: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(REVEALS)),
  date: v.optional(v.string()),
})

export default defineEventHandler(async (event) => {
  assertRateLimit(`daily-guess:${clientIp(event)}`, RATE_LIMITS.dailyGuess)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const puzzle = await ensurePuzzle(db, gameDate(body.date))
  const [word, order] = await Promise.all([
    db.query.words.findFirst({ where: eq(schema.words.id, puzzle.wordId) }),
    visibleRevealOrder(db, puzzle),
  ])
  if (!word) throw createError({ statusCode: 500, statusMessage: 'تعذر تحميل اللغز' })

  const correct = body.guess ? await isCorrectGuess(db, body.guess, word.headwordNormalized) : false
  const exhausted = body.reveal >= order.length

  if (correct || exhausted) {
    return {
      correct, guesses: body.reveal, date: puzzle.date, number: puzzleNumber(puzzle.date),
      word: { headword: word.headword, slug: word.slug, definition: word.definition },
    }
  }

  const nextId = order[body.reveal]!
  const nextEntry = await db.query.entries.findFirst({ where: eq(schema.entries.id, nextId), with: { dialect: true } })
  return {
    correct: false,
    next: nextEntry ? { dialect: nextEntry.dialect.slug, nameAr: nextEntry.dialect.nameAr, form: nextEntry.form } : null,
  }
})
