import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { ensurePuzzle, isCorrectGuess, todayDate } from '../../utils/daily'
import { puzzleNumber } from '../../../shared/utils/daily'
import { assertRateLimit, clientIp } from '../../utils/rateLimit'

/**
 * A guess against today's puzzle (docs/REACH.md, Phase R3). Right or wrong,
 * the response says so; wrong and there is another reveal left says what it
 * is; wrong (or a pass, sent as an empty guess) with nothing left to reveal
 * ends the round and returns the answer, same as a correct guess does.
 */
const Body = v.object({
  guess: v.pipe(v.string(), v.trim(), v.maxLength(80)),
  reveal: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(6)),
})

export default defineEventHandler(async (event) => {
  assertRateLimit(`daily-guess:${clientIp(event)}`, 60, 60 * 60 * 1000)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const puzzle = await ensurePuzzle(db, todayDate())
  const word = await db.query.words.findFirst({ where: eq(schema.words.id, puzzle.wordId) })
  if (!word) throw createError({ statusCode: 500, statusMessage: 'تعذر تحميل اللغز' })

  const correct = body.guess ? await isCorrectGuess(db, body.guess, word.headwordNormalized) : false
  const exhausted = body.reveal >= puzzle.revealOrder.length

  if (correct || exhausted) {
    return {
      correct, guesses: body.reveal, date: puzzle.date, number: puzzleNumber(puzzle.date),
      word: { headword: word.headword, slug: word.slug, definition: word.definition },
    }
  }

  const nextId = puzzle.revealOrder[body.reveal]!
  const nextEntry = await db.query.entries.findFirst({ where: eq(schema.entries.id, nextId), with: { dialect: true } })
  return {
    correct: false,
    next: nextEntry ? { dialect: nextEntry.dialect.slug, nameAr: nextEntry.dialect.nameAr, form: nextEntry.form } : null,
  }
})
