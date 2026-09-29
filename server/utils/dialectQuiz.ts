import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { schema, type Db } from '../db'
import type { Tx } from './contribute'
import { looseArabicKey } from '../../shared/utils/arabic'

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

/**
 * Words worth asking about: at least CHOICES dialect groups have a confirmed
 * form for them, so there is a right answer and enough wrong ones. A form
 * is confirmed when its link is not marked needs_review (a language-model
 * draft nobody has checked) and has not been voted down — a weak form must
 * not be the answer, and it cannot vouch for a wrong one either.
 */
const CONFIRMED = sql`${schema.wordEntryLinks.needsReview} = false and ${schema.wordEntryLinks.score} >= 0`

async function candidateWords(tx: Tx): Promise<number[]> {
  const result: any = await tx.execute(sql`
    select ${schema.wordEntryLinks.wordId} as "wordId"
    from ${schema.wordEntryLinks}
    join ${schema.entries} on ${schema.entries.id} = ${schema.wordEntryLinks.entryId}
    join ${schema.words} on ${schema.words.id} = ${schema.wordEntryLinks.wordId}
    join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
    where ${schema.entries.status} = 'active'
      and ${schema.wordEntryLinks.status} = 'active'
      and ${schema.words.status} = 'active'
      and ${CONFIRMED}
    group by ${schema.wordEntryLinks.wordId}
    having count(distinct coalesce(${schema.dialects.parentId}, ${schema.dialects.id})) >= ${CHOICES}
    order by random()
    limit 20
  `)
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? []
  return rows.map(r => Number(r.wordId ?? r.wordid))
}

/**
 * One round from this word, or null if it cannot make a fair one. The answer
 * is a confirmed form no other group shares; each wrong choice is a group
 * with a confirmed form of its own that is really spelled differently
 * (looseArabicKey: ت/ث, a final ة/ا and the like do not count). A group with
 * no form here, or only an unchecked one, is never offered: its word may
 * well be the answer's, and a fair guess would be marked wrong.
 */
async function pickFromWord(tx: Tx, wordId: number, activeGroups: Set<number>) {
  const result: any = await tx.execute(sql`
    select
      ${schema.entries.id} as "entryId",
      ${schema.entries.formNormalized} as "formNormalized",
      coalesce(${schema.dialects.parentId}, ${schema.dialects.id}) as "groupId",
      (${CONFIRMED}) as confirmed
    from ${schema.entries}
    join ${schema.wordEntryLinks} on ${schema.wordEntryLinks.entryId} = ${schema.entries.id}
    join ${schema.dialects} on ${schema.dialects.id} = ${schema.entries.dialectId}
    where ${schema.wordEntryLinks.wordId} = ${wordId}
      and ${schema.entries.status} = 'active'
      and ${schema.wordEntryLinks.status} = 'active'
  `)
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? []
  const forms = rows
    .map(r => ({
      entryId: Number(r.entryId ?? r.entryid),
      groupId: Number(r.groupId ?? r.groupid),
      key: looseArabicKey(String(r.formNormalized ?? r.formnormalized)),
      confirmed: r.confirmed === true || r.confirmed === 't',
    }))
    .filter(f => activeGroups.has(f.groupId))

  // Every key a group has here, checked or not: an unchecked form that
  // matches the answer is still reason enough to keep that group out.
  const keysByGroup = new Map<number, Set<string>>()
  for (const f of forms) {
    if (!keysByGroup.has(f.groupId)) keysByGroup.set(f.groupId, new Set())
    keysByGroup.get(f.groupId)!.add(f.key)
  }
  const confirmedGroups = new Set(forms.filter(f => f.confirmed).map(f => f.groupId))

  const answers = shuffle(forms.filter(f => f.confirmed))
  for (const answer of answers) {
    const others = [...keysByGroup].filter(([g]) => g !== answer.groupId)
    // Another group says it the same way: the question has two right answers.
    if (others.some(([, keys]) => keys.has(answer.key))) continue
    const distractors = shuffle(others
      .filter(([g, keys]) => confirmedGroups.has(g) && !keys.has(answer.key))
      .map(([g]) => g))
    if (distractors.length < CHOICES - 1) continue
    return { entryId: answer.entryId, groupId: answer.groupId, distractors: distractors.slice(0, CHOICES - 1) }
  }
  return null
}

/** Fisher-Yates on a copy — good enough for a handful of items. */
function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

async function createRound(tx: Tx, date: string, slot: number): Promise<RoundRow> {
  const already = await tx.query.dialectQuizRounds.findFirst({
    where: and(eq(schema.dialectQuizRounds.date, date), eq(schema.dialectQuizRounds.slot, slot)),
  })
  if (already) return already

  const groups = await tx.query.dialects.findMany({
    where: and(isNull(schema.dialects.parentId), eq(schema.dialects.active, 1)),
  })
  const activeGroups = new Set(groups.map(g => g.id))

  // A few random words, in case the first draws cannot make a fair round
  // (the other dialects' forms here are unchecked, or too close to the answer).
  for (const wordId of await candidateWords(tx)) {
    const picked = await pickFromWord(tx, wordId, activeGroups)
    if (!picked) continue

    const choiceGroupIds = shuffle([picked.groupId, ...picked.distractors])
    try {
      const [row] = await tx.insert(schema.dialectQuizRounds).values({
        date, slot, entryId: picked.entryId, wordId,
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
