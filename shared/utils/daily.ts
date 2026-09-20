/**
 * Constants for the daily game (docs/REACH.md, Phase R3) that both the server
 * (building and checking a puzzle) and the client (rendering progress dots and
 * the share text) need to agree on.
 */

/** Six reveals, per the plan — fewer only for a word thin enough that MIN_GROUPS barely clears. */
export const REVEALS = 6

/** The day server/utils/daily.ts started numbering puzzles from. */
const EPOCH = '2026-09-20'

/** Today's calendar day, UTC: the game changes for everyone at the same moment rather than at each visitor's local midnight. */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** «لهجة اليومية ١٢»: the day's ordinal since the game's own launch, not the calendar date — nicer to say and to share. */
export function puzzleNumber(date: string): number {
  const ms = new Date(`${date}T00:00:00Z`).getTime() - new Date(`${EPOCH}T00:00:00Z`).getTime()
  return Math.floor(ms / 86_400_000) + 1
}

/** The calendar day before `date`, in the same 'YYYY-MM-DD' shape. */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
