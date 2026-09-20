import { inArray } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { ensurePuzzle, REVEALS, todayDate } from '../../utils/daily'
import { puzzleNumber } from '../../../shared/utils/daily'

/**
 * Today's puzzle: the dialect forms up to the reveal the client says it has
 * reached (docs/REACH.md, Phase R3). The answer, and anything that names the
 * word, is never in this payload — a puzzle solved by opening devtools is not
 * a puzzle. ?reveal=N asks for the first N forms (1–6); the client tracks its
 * own progress in local storage and asks again after each wrong guess.
 */
export default defineEventHandler(async (event) => {
  const { reveal } = getQuery(event)
  const n = Math.min(Math.max(Number(reveal) || 1, 1), REVEALS)
  const db = await useDb()
  const date = todayDate()
  const puzzle = await ensurePuzzle(db, date)

  const entryIds = puzzle.revealOrder.slice(0, n)
  const entries = entryIds.length
    ? await db.query.entries.findMany({ where: inArray(schema.entries.id, entryIds), with: { dialect: true } })
    : []
  const byId = new Map(entries.map(e => [e.id, e]))
  const forms = entryIds
    .map(id => byId.get(id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map(e => ({ dialect: e.dialect.slug, nameAr: e.dialect.nameAr, form: e.form }))

  return { date, number: puzzleNumber(date), total: puzzle.revealOrder.length, forms }
})
