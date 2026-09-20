import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { todayDate } from '../../../../shared/utils/daily'

/** The daily-puzzle queue (docs/REACH.md, Phase R3): every date with a word set, newest first, for the curation screen to show and to check for gaps in. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const rows = await db.query.dailyPuzzles.findMany({
    orderBy: desc(schema.dailyPuzzles.date),
    limit: 90,
    with: { word: true },
  })
  return {
    today: todayDate(),
    puzzles: rows.map(r => ({
      date: r.date,
      word: { id: r.word.id, headword: r.word.headword, slug: r.word.slug },
    })),
  }
})
