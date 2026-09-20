import { eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { todayDate } from '../../utils/daily'
import { puzzleNumber } from '../../../shared/utils/daily'

/**
 * A past day's puzzle, solved: the word, its definition, and every dialect
 * form in reveal order — real content for the archive at /daily/[date] to be
 * indexed on (docs/REACH.md, Phase R3). Only for a date before today: the
 * live puzzle's answer stays behind the guess endpoint, never this one, or
 * anyone reading the network tab could read tomorrow's answer a day early.
 */
export default defineEventHandler(async (event) => {
  const date = getRouterParam(event, 'date')!
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= todayDate()) {
    throw createError({ statusCode: 404, statusMessage: 'لا يوجد لغز لهذا اليوم' })
  }
  const db = await useDb()
  const puzzle = await db.query.dailyPuzzles.findFirst({ where: eq(schema.dailyPuzzles.date, date) })
  if (!puzzle) throw createError({ statusCode: 404, statusMessage: 'لا يوجد لغز لهذا اليوم' })

  const [word, entries] = await Promise.all([
    db.query.words.findFirst({ where: eq(schema.words.id, puzzle.wordId) }),
    db.query.entries.findMany({ where: inArray(schema.entries.id, puzzle.revealOrder), with: { dialect: true } }),
  ])
  if (!word) throw createError({ statusCode: 404, statusMessage: 'لا يوجد لغز لهذا اليوم' })

  const byId = new Map(entries.map(e => [e.id, e]))
  const forms = puzzle.revealOrder
    .map(id => byId.get(id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map(e => ({ dialect: e.dialect.slug, nameAr: e.dialect.nameAr, form: e.form }))

  return {
    date, number: puzzleNumber(date),
    word: { headword: word.headword, slug: word.slug, definition: word.definition },
    forms,
  }
})
