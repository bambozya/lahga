/**
 * The daily game's streak and history (docs/REACH.md, Phase R3). No account is
 * needed to play, so this lives in the browser alone — signing in to keep a
 * streak across devices is future work, not this. Safe to call from SSR or a
 * private window: every read and write is wrapped, and a failure just means
 * no streak is remembered, not a broken page.
 */
const KEY = 'lahga-daily'

interface DailyResult {
  guesses: number
  correct: boolean
  word: { headword: string, slug: string | null, definition: string | null }
}

interface DailyState {
  streak: number
  lastPlayedDate: string | null
  history: Record<string, DailyResult>
}

function empty(): DailyState {
  return { streak: 0, lastPlayedDate: null, history: {} }
}

function load(): DailyState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    return { ...empty(), ...parsed }
  } catch {
    return empty()
  }
}

function save(state: DailyState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window, quota, … */ }
}

export function useDailyProgress() {
  const state = ref<DailyState>(empty())
  onMounted(() => { state.value = load() })

  /** Called once, when today's round ends (a correct guess, or the reveals ran out). */
  function recordResult(date: string, result: DailyResult) {
    if (state.value.history[date]) return // already recorded — a refresh must not double-count the streak
    const s = { ...state.value, history: { ...state.value.history, [date]: result } }
    s.streak = s.lastPlayedDate === dayBefore(date) ? s.streak + 1 : 1
    s.lastPlayedDate = date
    state.value = s
    save(s)
  }

  const playedToday = (date: string) => !!state.value.history[date]
  const resultFor = (date: string) => state.value.history[date] ?? null

  return { state, recordResult, playedToday, resultFor }
}
