import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { schema, type Db } from '../db'
import type { Tx } from './contribute'

/**
 * «من أي لهجة؟»: three multiple-choice rounds a day, each asking which
 * dialect group says a given form. This file builds a day's rounds; the
 * server/api/dialect-quiz/* routes are the thin HTTP layer on top.
 */

export const SLOTS = 3
export const CHOICES = 4

type RoundRow = typeof schema.dialectQuizRounds.$inferSelect

/** A day's round at this slot (1–3), curated ahead or picked fresh the first time it is asked for. */
export async function ensureRound(db: Db, date: string, slot: number): Promise<RoundRow> {
  const existing = await db.query.dialectQuizRounds.findFirst({
    where: and(eq(schema.dialectQuizRounds.date, date), eq(schema.dialectQuizRounds.slot, slot)),
  })
  if (existing) return existing
  return db.transaction(tx => createRound(tx, date, slot))
}

/** One random active entry, with its word and the dialect group it belongs to. */
async function pickEntry(tx: Tx) {
  const result: any = await tx.execute(sql`
    select
      ${schema.entries.id} as "entryId",
      ${schema.entries.form} as form,
      ${schema.entries.formNormalized} as "formNormalized",
      ${schema.wordEntryLinks.wordId} as "wordId",
      coalesce(${schema.dialects.parentId}, ${schema.dialects.id}) as "groupId"
    from ${schema.entries}
    join ${schema.wordEntryLinks} on ${schema.wordEntryLinks.entryId} = ${schema.entries.id}
    join ${schema.words} on ${schema.words.id} = ${schema.wordEntryLinks.wordId}
    join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
    where ${schema.entries.status} = 'active'
      and ${schema.wordEntryLinks.status} = 'active'
      and ${schema.words.status} = 'active'
    order by random()
    limit 1
  `)
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? []
  if (!rows.length) return null
  const r = rows[0]
  return {
    entryId: Number(r.entryId), wordId: Number(r.wordId), groupId: Number(r.groupId ?? r.groupid),
    form: String(r.form), formNormalized: String(r.formNormalized),
  }
}

/**
 * Up to CHOICES-1 distractor dialect groups for this word: any other active
 * top-level group except the ones whose own entry on this same word is the
 * same form — a tied group would make the "correct" answer arguable, so it
 * is excluded rather than risk marking a fair guess wrong.
 */
async function pickDistractors(tx: Tx, wordId: number, correctGroupId: number, formNormalized: string): Promise<number[]> {
  const tied: any = await tx.execute(sql`
    select distinct coalesce(${schema.dialects.parentId}, ${schema.dialects.id}) as "groupId"
    from ${schema.entries}
    join ${schema.wordEntryLinks} on ${schema.wordEntryLinks.entryId} = ${schema.entries.id}
    join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
    where ${schema.wordEntryLinks.wordId} = ${wordId}
      and ${schema.entries.formNormalized} = ${formNormalized}
      and ${schema.entries.status} = 'active'
      and ${schema.wordEntryLinks.status} = 'active'
  `)
  const tiedRows: any[] = Array.isArray(tied) ? tied : tied?.rows ?? []
  const excluded = new Set([correctGroupId, ...tiedRows.map(r => Number(r.groupId ?? r.groupid))])

  const groups = await tx.query.dialects.findMany({
    where: and(isNull(schema.dialects.parentId), eq(schema.dialects.active, 1)),
  })
  const pool = groups.map(g => g.id).filter(id => !excluded.has(id))
  // Fisher-Yates, then take the first CHOICES-1 — good enough for a handful of groups.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, CHOICES - 1)
}

async function createRound(tx: Tx, date: string, slot: number): Promise<RoundRow> {
  const already = await tx.query.dialectQuizRounds.findFirst({
    where: and(eq(schema.dialectQuizRounds.date, date), eq(schema.dialectQuizRounds.slot, slot)),
  })
  if (already) return already

  // A handful of tries in case a draw lands on a word too thin to offer three
  // fair distractors (only relevant on a dictionary with very few dialects).
  for (let attempt = 0; attempt < 8; attempt++) {
    const picked = await pickEntry(tx)
    if (!picked) break
    const distractors = await pickDistractors(tx, picked.wordId, picked.groupId, picked.formNormalized)
    if (distractors.length < CHOICES - 1) continue

    const choiceGroupIds = [picked.groupId, ...distractors]
    for (let i = choiceGroupIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choiceGroupIds[i], choiceGroupIds[j]] = [choiceGroupIds[j]!, choiceGroupIds[i]!]
    }
    try {
      const [row] = await tx.insert(schema.dialectQuizRounds).values({
        date, slot, entryId: picked.entryId, wordId: picked.wordId,
        correctGroupId: picked.groupId, choiceGroupIds,
      }).returning()
      return row!
    } catch {
      // Another request raced this one for the same (date, slot); the unique
      // index rejects the loser's insert, which then just reads the winner's row.
      const row = await tx.query.dialectQuizRounds.findFirst({
        where: and(eq(schema.dialectQuizRounds.date, date), eq(schema.dialectQuizRounds.slot, slot)),
      })
      if (row) return row
      throw createError({ statusCode: 503, statusMessage: 'تعذر إنشاء الجولة' })
    }
  }
  throw createError({ statusCode: 503, statusMessage: 'لا توجد كلمة مناسبة لهذه الجولة' })
}

/** The dialect group names for a set of ids, in the given order. */
export async function groupNames(db: Db, ids: number[]): Promise<Map<number, string>> {
  if (!ids.length) return new Map()
  const rows = await db.select({ id: schema.dialects.id, nameAr: schema.dialects.nameAr })
    .from(schema.dialects).where(inArray(schema.dialects.id, ids))
  return new Map(rows.map(r => [r.id, r.nameAr]))
}
