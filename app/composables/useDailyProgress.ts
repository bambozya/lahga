/**
 * كلمة اليوم's memory in this browser: the game kit (useGameProgress) under the
 * daily game's own key, typed for its results. Shared by /daily, which plays
 * the round, and /daily/[date], which says how a past day went.
 */
export type DailyForm = { dialect: string, nameAr: string, form: string }
export type DailyResult = {
  guesses: number
  correct: boolean
  word: { headword: string, slug: string | null, definition: string | null }
}
/** The round in progress: the forms revealed so far. */
export type DailyRound = { forms: DailyForm[] }

export const useDailyProgress = () => useGameProgress<DailyResult, DailyRound>('lahga-daily')
