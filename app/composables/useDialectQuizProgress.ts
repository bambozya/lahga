/**
 * «من أي لهجة؟»'s own streak and history — the same idea as useDailyProgress,
 * kept as a separate key and a separate streak: the two games are played
 * independently, and a day playing one but not the other should not silently
 * break a streak in the game nobody touched.
 */
const KEY = 'lahga-dialect-quiz'

interface QuizResult { correct: number, total: number }

interface QuizState {
  streak: number
  lastPlayedDate: string | null
  history: Record<string, QuizResult>
}

function empty(): QuizState {
  return { streak: 0, lastPlayedDate: null, history: {} }
}

function load(): QuizState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

function save(state: QuizState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window, quota, … */ }
}

export function useDialectQuizProgress() {
  const state = ref<QuizState>(empty())
  onMounted(() => { state.value = load() })

  function recordResult(date: string, result: QuizResult) {
    if (state.value.history[date]) return
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
