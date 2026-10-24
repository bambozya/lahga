// Imported by path rather than auto-imported, so tests/unit can load this file.
import { onMounted, ref, type Ref } from 'vue'
import { GAME_HISTORY_DAYS } from '../../shared/config/rules'
import { dayBefore } from '../../shared/utils/daily'

/**
 * A daily game's memory in this browser (docs/ROADMAP.md B3): one result per
 * day, the streak, and the round in progress, so a refresh mid-round picks up
 * where it was. No account is needed to play, so this is all there is; signing
 * in to keep a streak across devices is roadmap #39.
 *
 * Each game has its own key and its own streak: a day playing one game but not
 * the other must not break the streak of the game nobody touched.
 *
 * Safe in SSR and in a private window: nothing is read before mount, and every
 * read and write is wrapped, so a failure means nothing is remembered, never a
 * broken page.
 *
 * The stored shape carries a version. To change it, raise VERSION and teach
 * migrate() to turn the previous shape into the new one; a player's history
 * then survives the deploy.
 */
const VERSION = 2

interface Stored<R, P> {
  v: number
  streak: number
  lastPlayedDate: string | null
  history: Record<string, R>
  /** The round begun but not finished, for exactly one date. */
  current: { date: string, round: P } | null
}

function empty<R, P>(): Stored<R, P> {
  return { v: VERSION, streak: 0, lastPlayedDate: null, history: {}, current: null }
}

/** Brings any earlier stored shape up to the current one. */
export function migrate<R, P>(raw: any): Stored<R, P> {
  if (!raw || typeof raw !== 'object') return empty()
  // v1 (before the kit): { streak, lastPlayedDate, history }, no version, no round in progress.
  const v = typeof raw.v === 'number' ? raw.v : 1
  if (v > VERSION) return empty() // written by a newer site than this one; start clean rather than misread it
  return {
    v: VERSION,
    streak: Number(raw.streak) || 0,
    lastPlayedDate: typeof raw.lastPlayedDate === 'string' ? raw.lastPlayedDate : null,
    history: raw.history && typeof raw.history === 'object' ? raw.history : {},
    current: v >= 2 && raw.current && typeof raw.current.date === 'string' ? raw.current : null,
  }
}

/** Keeps the newest `max` days. Dates are 'YYYY-MM-DD', so they sort as text. */
export function capHistory<R>(history: Record<string, R>, max = GAME_HISTORY_DAYS): Record<string, R> {
  const dates = Object.keys(history).sort()
  if (dates.length <= max) return history
  return Object.fromEntries(dates.slice(-max).map(d => [d, history[d]!]))
}

/**
 * The streak as it stands on `today`: days in a row with a finished round. It
 * survives until the end of the day after the last one played, so a player who
 * has not played yet today still sees yesterday's streak, and loses it only
 * once today is over too.
 */
export function liveStreak(stored: { streak: number, lastPlayedDate: string | null }, today: string): number {
  if (!stored.lastPlayedDate) return 0
  return stored.lastPlayedDate === today || stored.lastPlayedDate === dayBefore(today) ? stored.streak : 0
}

export function useGameProgress<R, P = never>(key: string) {
  const state = ref(empty<R, P>()) as Ref<Stored<R, P>>
  const loaded = ref(false)

  onMounted(() => {
    try {
      const raw = localStorage.getItem(key)
      state.value = raw ? migrate<R, P>(JSON.parse(raw)) : empty()
    } catch {
      state.value = empty()
    }
    loaded.value = true
  })

  function save() {
    try { localStorage.setItem(key, JSON.stringify(state.value)) } catch { /* private window, quota, … */ }
  }

  /** Called once, when a day's round ends. A second call for the same day (a refresh) changes nothing. */
  function recordResult(date: string, result: R) {
    if (state.value.history[date]) return
    const s = state.value
    state.value = {
      ...s,
      history: capHistory({ ...s.history, [date]: result }),
      streak: s.lastPlayedDate === dayBefore(date) ? s.streak + 1 : 1,
      lastPlayedDate: date,
      current: null,
    }
    save()
  }

  /** Remembers the round in progress, so a refresh can resume it. */
  function saveRound(date: string, round: P) {
    state.value = { ...state.value, current: { date, round } }
    save()
  }

  const resultFor = (date: string): R | null => state.value.history[date] ?? null
  const playedOn = (date: string) => !!state.value.history[date]
  const roundFor = (date: string): P | null => state.value.current?.date === date ? state.value.current.round : null
  const streak = (today: string) => liveStreak(state.value, today)

  return { state, loaded, recordResult, saveRound, resultFor, playedOn, roundFor, streak }
}
