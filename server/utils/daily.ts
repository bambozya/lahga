import { eq, sql } from 'drizzle-orm'
import { schema, type Db } from '../db'
import { normalizeArabic } from '../../shared/utils/arabic'
import { REVEALS } from '../../shared/utils/daily'
import { MIN_GROUPS } from '../api/divergent.get'
import type { Tx } from './contribute'

/**
 * The daily game (docs/REACH.md, Phase R3): one word, revealed one dialect
 * group at a time, hardest first. This file builds a day's puzzle and checks
 * a guess against it; server/api/daily/* is the thin HTTP layer on top.
 */

export { REVEALS, todayDate } from '../../shared/utils/daily'

type PuzzleRow = typeof schema.dailyPuzzles.$inferSelect

/** Today's puzzle if one is curated for the date already, or a freshly picked and stored one. */
export async function ensurePuzzle(db: Db, date: string): Promise<PuzzleRow> {
  const existing = await db.query.dailyPuzzles.findFirst({ where: eq(schema.dailyPuzzles.date, date) })
  if (existing) return existing
  return db.transaction(tx => createFallbackPuzzle(tx, date))
}

/**
 * One entry per dialect group for this word, most-divergent-from-the-headword
 * first: the entry least similar to the MSA headword gives away the least,
 * so it opens the puzzle; each later reveal reads closer to the answer. The
 * group's best-scored entry stands for it, so an obscure sub-dialect form
 * never opens a puzzle that a better-known form of the same word would have
 * made easier to read.
 */
async function buildRevealOrder(tx: Tx, word: { id: number, headwordNormalized: string }): Promise<number[]> {
  const result: any = await tx.execute(sql`
    with group_entries as (
      select
        ${schema.entries.id} as entry_id,
        similarity(${schema.entries.formNormalized}, ${word.headwordNormalized}) as sim,
        row_number() over (
          partition by coalesce(${schema.dialects.parentId}, ${schema.dialects.id})
          order by ${schema.entries.score} desc
        ) as rn
      from ${schema.wordEntryLinks}
      join ${schema.entries} on ${schema.entries.id} = ${schema.wordEntryLinks.entryId}
      join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
      where ${schema.wordEntryLinks.wordId} = ${word.id}
        and ${schema.wordEntryLinks.status} = 'active'
        and ${schema.entries.status} = 'active'
    )
    select entry_id as "entryId" from group_entries
    where rn = 1
    order by sim asc, entry_id
    limit ${REVEALS}
  `)
  const rows: { entryId: number }[] = Array.isArray(result) ? result : result?.rows ?? []
  return rows.map(r => Number(r.entryId))
}

/** The most divergent word (docs/REACH.md, Phase R4's own ranking) that has not been a puzzle yet. */
async function pickUnusedWord(tx: Tx) {
  const used = await tx.select({ wordId: schema.dailyPuzzles.wordId }).from(schema.dailyPuzzles)
  const usedIds = used.map(u => u.wordId)
  const exclude = usedIds.length ? sql`and ${schema.words.id} not in (${sql.join(usedIds.map(id => sql`${id}`), sql`, `)})` : sql``

  const result: any = await tx.execute(sql`
    with group_forms as (
      select
        ${schema.wordEntryLinks.wordId} as word_id,
        coalesce(${schema.dialects.parentId}, ${schema.dialects.id}) as group_id,
        ${schema.entries.formNormalized} as form_normalized
      from ${schema.wordEntryLinks}
      join ${schema.entries} on ${schema.entries.id} = ${schema.wordEntryLinks.entryId}
      join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
      join ${schema.words} on ${schema.words.id} = ${schema.wordEntryLinks.wordId}
      where ${schema.wordEntryLinks.status} = 'active'
        and ${schema.entries.status} = 'active'
        and ${schema.words.status} = 'active'
        ${exclude}
    )
    select word_id as "wordId",
      (count(distinct form_normalized)::float / count(distinct group_id)) as score
    from group_forms
    group by word_id
    having count(distinct group_id) >= ${MIN_GROUPS}
    order by score desc, count(distinct group_id) desc, word_id
    limit 1
  `)
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? []
  if (!rows.length) return null
  const wordId = Number(rows[0].wordId ?? rows[0].word_id)
  return tx.query.words.findFirst({ where: eq(schema.words.id, wordId) })
}

async function createFallbackPuzzle(tx: Tx, date: string): Promise<PuzzleRow> {
  // A second request racing to create today's puzzle finds it already there.
  const already = await tx.query.dailyPuzzles.findFirst({ where: eq(schema.dailyPuzzles.date, date) })
  if (already) return already

  const word = await pickUnusedWord(tx)
  if (!word) throw createError({ statusCode: 503, statusMessage: 'لا توجد كلمة صالحة للعبة اليوم' })
  const revealOrder = await buildRevealOrder(tx, word)
  try {
    const [row] = await tx.insert(schema.dailyPuzzles).values({ date, wordId: word.id, revealOrder }).returning()
    return row!
  } catch {
    // Two of the day's first requests raced past the check above; date is
    // unique, so the loser's insert fails and it reads the winner's row instead.
    const row = await tx.query.dailyPuzzles.findFirst({ where: eq(schema.dailyPuzzles.date, date) })
    if (row) return row
    throw createError({ statusCode: 503, statusMessage: 'تعذر إنشاء لغز اليوم' })
  }
}

/**
 * A guess is right on an exact normalised match, or on a near miss — a stray
 * letter or hamza — via the same trigram similarity the search box uses for
 * "did you mean". The threshold is much stricter than search's own (0.25,
 * a loose net meant to catch anything worth suggesting): here it only forgives
 * a typo, not a different word that happens to share a root.
 */
export async function isCorrectGuess(db: Db, guess: string, headwordNormalized: string): Promise<boolean> {
  const g = normalizeArabic(guess)
  if (!g) return false
  if (g === headwordNormalized) return true
  const result: any = await db.execute(sql`select similarity(${g}, ${headwordNormalized}) as sim`)
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? []
  return Number(rows[0]?.sim ?? 0) >= 0.6
}
