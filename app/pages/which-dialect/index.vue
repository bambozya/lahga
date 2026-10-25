<script setup lang="ts">
import { QUIZ_ROUNDS } from '~~/shared/config/rules'
// «من أي لهجة؟» (docs/REACH.md, Phase R3): three multiple-choice rounds a day,
// each asking which dialect group says a given form. Unlike كلمة اليوم there is
// nothing to reveal gradually — one guess ends a round either way — so the
// game is just three quick questions and a score out of three.
type Choice = { id: number, nameAr: string }
type Round = { date: string, slot: number, total: number, form: string, word: { headword: string, definition: string | null }, choices: Choice[] }
type Feedback = { correct: boolean, correctGroupId: number, correctNameAr: string, word: { headword: string, slug: string | null } }
type QuizResult = { correct: number, total: number }
/** Everything on screen mid-game, so a refresh puts it all back (game kit, useGameProgress). */
type QuizRound = { round: Round, scores: boolean[], selectedId: number | null, feedback: Feedback | null }

const { data: initial } = await useFetch<Round>('/api/dialect-quiz', { query: { slot: 1 } })

const progress = useGameProgress<QuizResult, QuizRound>('lahga-dialect-quiz')

const date = computed(() => initial.value?.date ?? '')
const total = computed(() => initial.value?.total ?? QUIZ_ROUNDS)
const round = ref<Round | null>(initial.value ?? null)
const scores = ref<boolean[]>([])
const selectedId = ref<number | null>(null)
const feedback = ref<Feedback | null>(null)
const answered = computed(() => !!feedback.value)

const busy = ref(false)
const failure = ref('')
const finalResult = ref<QuizResult | null>(null)

// For screen readers (docs/ROADMAP.md B5): one live region, on the page from
// the start, and focus that follows the game: to «الجولة التالية» after an
// answer, to the new question after it, to the result at the end.
const announcement = ref('')
const nextButton = ref<HTMLButtonElement | null>(null)
const question = ref<HTMLElement | null>(null)
const resultPanel = ref<{ $el: HTMLElement } | null>(null)

const remember = () => {
  if (round.value) progress.saveRound(date.value, { round: round.value, scores: scores.value, selectedId: selectedId.value, feedback: feedback.value })
}

onMounted(() => {
  if (!date.value) return
  const saved = progress.resultFor(date.value)
  if (saved) {
    finalResult.value = saved
    return
  }
  // A refresh mid-game: back to the same round, answers kept, and an answered
  // round stays answered rather than open for a second try.
  const resumed = progress.roundFor(date.value)
  if (resumed) {
    round.value = resumed.round
    scores.value = resumed.scores
    selectedId.value = resumed.selectedId
    feedback.value = resumed.feedback
  }
})

// Focus moves once busy is cleared (a disabled button cannot take focus) and
// the page has redrawn (the button may not exist yet).
const focusSoon = async (target: () => { focus(): void } | null | undefined) => {
  await nextTick()
  target()?.focus()
}

const choose = async (groupId: number) => {
  if (answered.value || busy.value || !round.value) return
  busy.value = true
  failure.value = ''
  try {
    const data = await $fetch('/api/dialect-quiz/guess', { method: 'POST', body: { slot: round.value.slot, groupId, date: date.value } })
    selectedId.value = groupId
    feedback.value = data
    scores.value = [...scores.value, data.correct]
    remember()
    announcement.value = data.correct ? 'صحيح!' : `غير صحيح. الإجابة: ${data.correctNameAr}.`
  } catch (e: any) {
    failure.value = e?.data?.statusMessage || 'تعذر إرسال الإجابة'
  } finally {
    busy.value = false
  }
  if (answered.value) await focusSoon(() => nextButton.value)
}

const next = async () => {
  if (scores.value.length >= total.value) {
    const result = { correct: scores.value.filter(Boolean).length, total: total.value }
    finalResult.value = result
    progress.recordResult(date.value, result)
    announcement.value = `${arabicDigits(result.correct)} من ${arabicDigits(result.total)} إجابات صحيحة اليوم.`
    await focusSoon(() => resultPanel.value?.$el)
    return
  }
  busy.value = true
  failure.value = ''
  try {
    round.value = await $fetch<Round>('/api/dialect-quiz', { query: { slot: round.value!.slot + 1, date: date.value } })
    selectedId.value = null
    feedback.value = null
    remember()
    announcement.value = `جولة ${arabicDigits(round.value.slot)} من ${arabicDigits(total.value)}: ${round.value.form}`
  } catch (e: any) {
    failure.value = e?.data?.statusMessage || 'تعذر تحميل الجولة التالية'
  } finally {
    busy.value = false
  }
  if (!answered.value && !failure.value) await focusSoon(() => question.value)
}

const cardAlt = computed(() => finalResult.value
  ? `بطاقة نتيجة من أي لهجة؟: ${arabicDigits(finalResult.value.correct)} من ${arabicDigits(finalResult.value.total)} إجابات صحيحة`
  : '')
const cardUrl = computed(() => {
  if (!date.value || !finalResult.value) return ''
  const q = new URLSearchParams({ date: date.value, correct: String(finalResult.value.correct), total: String(finalResult.value.total) })
  return `/og/dialect-quiz-result.png?${q}`
})
const shareText = computed(() => {
  if (!finalResult.value) return ''
  const { correct, total: t } = finalResult.value
  const squares = Array.from({ length: t }, (_, i) => i < correct ? '🟩' : '🟥').join('')
  return `من أي لهجة؟ ${arabicDigits(correct)}/${arabicDigits(t)}\n${squares}\nlahga.fyi/which-dialect`
})

useSeo({
  title: 'من أي لهجة؟',
  description: 'ثلاث جولات كل يوم: كلمة كما تُقال في لهجة ما، وأربعة خيارات — خمّن أيّ لهجة تكون. لعبة يومية جديدة كل يوم، بلا حساب.',
  path: '/which-dialect',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الألغاز', to: '/games' }, { label: 'من أي لهجة؟' }]" />
    <hgroup class="head">
      <h1>من أي لهجة؟</h1>
      <p>كلمة كما تُقال في لهجة ما — أيّ لهجة تكون؟</p>
    </hgroup>

    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>

    <GameResult
      v-if="finalResult" ref="resultPanel"
      :card-url="cardUrl" :card-alt="cardAlt" file-name="lahga-which-dialect.png"
      :share-text="shareText" :streak="progress.streak(date)"
    >
      <p>{{ arabicDigits(finalResult.correct) }}/{{ arabicDigits(finalResult.total) }} إجابات صحيحة اليوم.</p>
      <template #links>
        <NuxtLink to="/daily" class="cta">العب كلمة اليوم</NuxtLink>
      </template>
    </GameResult>
    <template v-else-if="round">
      <p role="alert" v-if="failure">{{ failure }}</p>
      <p class="progress"><small>جولة {{ arabicDigits(round.slot) }} من {{ arabicDigits(total) }}</small></p>

      <div ref="question" class="question" tabindex="-1">
        <p class="context">
          بالفصحى: <b>{{ round.word.headword }}</b>
          <template v-if="round.word.definition"> — {{ round.word.definition }}</template>
        </p>
        <p class="form"><dfn>{{ round.form }}</dfn></p>
      </div>

      <ul class="choices">
        <li v-for="c in round.choices" :key="c.id">
          <button
            type="button"
            :disabled="busy || answered"
            :class="{ chosen: selectedId === c.id, correct: answered && c.id === feedback?.correctGroupId, wrong: answered && selectedId === c.id && !feedback?.correct }"
            @click="choose(c.id)"
          >{{ c.nameAr }}</button>
        </li>
      </ul>

      <div v-if="answered && feedback" class="feedback">
        <p v-if="feedback.correct">صحيح!</p>
        <p v-else>غير صحيح. الإجابة: <b>{{ feedback.correctNameAr }}</b></p>
        <p><NuxtLink v-if="feedback.word.slug" :to="`/w/${feedback.word.slug}`">افتح صفحة «{{ feedback.word.headword }}»</NuxtLink></p>
        <p><button ref="nextButton" type="button" :disabled="busy" @click="next">{{ round.slot >= total ? 'النتيجة النهائية' : 'الجولة التالية' }}</button></p>
      </div>
    </template>
  </article>
</template>

<style scoped>
.progress { margin-block-start: var(--space-m); }
.question { margin-block-start: var(--space-s); border-block-end: var(--rule); padding-block-end: var(--space-m); }
.question .context { color: var(--muted); font-size: var(--step--1); }
.question .form { margin-block-start: var(--space-xs); font: 700 var(--step-4)/1.3 var(--naskh); }

.choices { list-style: none; margin: var(--space-m) 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); }
.choices button { width: 100%; }
.choices button.chosen { border-color: var(--ink); }
.choices button.correct { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.choices button.wrong { text-decoration: line-through; opacity: 0.7; }

/* The look of a status line (main.css [role="status"]), without the role: the
   page's live region does the announcing. */
.feedback { margin-block-start: var(--space-m); background: var(--surface); border-inline-start: 6px solid var(--accent); padding: var(--space-xs) var(--space-s); font-weight: 600; }
</style>
