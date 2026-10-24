<script setup lang="ts">
import { REVEALS } from '~~/shared/config/rules'
import type { DailyForm, DailyResult } from '~/composables/useDailyProgress'
// «كلمة اليوم» (docs/REACH.md, Phase R3): one word, revealed one dialect at a
// time, hardest form first. No account, no server-side session — progress and
// the streak live in the browser (useDailyProgress, on the game kit), and the
// answer is never in the page payload until the round is over: it is checked
// by POST /api/daily/guess, not read out of a devtools tab.
//
// The initial form renders from a real server fetch, so the puzzle itself
// shows without JS; submitting a guess needs it, the same trade the vote and
// contribute forms already make elsewhere on the site.
const { data: initial } = await useFetch('/api/daily', { query: { reveal: 1 } })

const progress = useDailyProgress()

const date = computed(() => initial.value?.date ?? '')
const number = computed(() => initial.value?.number ?? 0)
const total = computed(() => initial.value?.total ?? REVEALS)
const forms = ref<DailyForm[]>(initial.value?.forms ?? [])
const reveal = computed(() => forms.value.length || 1)

const guess = ref('')
const busy = ref(false)
const failure = ref('')

const result = ref<DailyResult | null>(null)
const finished = computed(() => !!result.value)

// A round already finished today shows its saved result straight away, with
// no second request; one begun and left (a refresh, a closed tab) resumes
// with the forms it had revealed.
onMounted(() => {
  if (!date.value) return
  const saved = progress.resultFor(date.value)
  if (saved) {
    result.value = saved
    return
  }
  const round = progress.roundFor(date.value)
  if (round && round.forms.length > forms.value.length) forms.value = round.forms
})

const submit = async (skip: boolean) => {
  if (busy.value || finished.value) return
  busy.value = true
  failure.value = ''
  try {
    const data = await $fetch('/api/daily/guess', {
      method: 'POST',
      body: { guess: skip ? '' : guess.value, reveal: reveal.value, date: date.value },
    })
    guess.value = ''
    if ('word' in data) {
      result.value = data
      progress.recordResult(date.value, data)
    } else if (data.next) {
      forms.value = [...forms.value, data.next]
      progress.saveRound(date.value, { forms: forms.value })
    }
  } catch (e: any) {
    failure.value = e?.data?.statusMessage || 'تعذر إرسال التخمين'
  } finally {
    busy.value = false
  }
}

const arSquares = computed(() => {
  if (!result.value) return ''
  const { guesses, correct } = result.value
  return Array.from({ length: total.value }, (_, i) => {
    const attempt = i + 1
    if (attempt > guesses) return '⬜'
    return attempt === guesses && correct ? '🟩' : '🟥'
  }).join('')
})
const shareText = computed(() => {
  if (!result.value) return ''
  const score = result.value.correct ? arabicDigits(result.value.guesses) : '✗'
  return `كلمة اليوم ${arabicDigits(number.value)} · ${score}/${arabicDigits(total.value)}\n${arSquares.value}\nlahga.fyi/daily`
})
// Spoiler-free (docs/REACH.md, Phase R3): built from the score alone, so it
// carries nothing that would give the word away to someone who has not
// played yet.
const cardUrl = computed(() => {
  if (!date.value || !result.value) return ''
  const q = new URLSearchParams({
    date: date.value, guesses: String(result.value.guesses),
    correct: result.value.correct ? '1' : '0', total: String(total.value),
  })
  return `/og/daily-result.png?${q}`
})

useSeo({
  title: 'كلمة اليوم',
  description: 'خمّن الكلمة بالفصحى من ستة أشكال لهجية، لهجة واحدة تُكشف في كل مرة. لعبة يومية جديدة كل يوم، بلا حساب.',
  path: '/daily',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الألغاز', to: '/games' }, { label: 'كلمة اليوم' }]" />
    <hgroup class="head">
      <h1>كلمة اليوم <small v-if="number">#{{ arabicDigits(number) }}</small></h1>
      <p>كلمة واحدة بالفصحى، تُكشف لهجة بعد لهجة. خمّنها بأقل عدد من الكشوف.</p>
    </hgroup>

    <ol v-if="forms.length" class="reveals">
      <li v-for="f in forms" :key="f.dialect">
        <b>{{ f.form }}</b> <small>{{ f.nameAr }}</small>
      </li>
    </ol>

    <GameResult
      v-if="finished && result"
      :card-url="cardUrl" card-alt="بطاقة نتيجة كلمة اليوم" file-name="lahga-daily.png"
      :share-text="shareText" :streak="progress.streak(date)"
    >
      <p v-if="result.correct">أحسنت! خمّنتها من {{ arabicDigits(result.guesses) }} كشوف.</p>
      <p v-else>لم تُخمَّن اليوم. الكلمة كانت:</p>
      <p class="answer">
        <NuxtLink :to="`/w/${result.word.slug}`"><b>{{ result.word.headword }}</b></NuxtLink>
        <template v-if="result.word.definition"> — {{ result.word.definition }}</template>
      </p>
      <p class="squares" dir="ltr">{{ arSquares }}</p>
      <template #links>
        <NuxtLink :to="`/w/${result.word.slug}`" class="cta">افتح صفحة الكلمة</NuxtLink>
      </template>
    </GameResult>
    <template v-else>
      <p role="alert" v-if="failure">{{ failure }}</p>
      <form class="guess" @submit.prevent="submit(false)">
        <fieldset :disabled="busy">
          <label for="guess">الكلمة بالفصحى</label>
          <p class="row">
            <input id="guess" v-model="guess" required maxlength="80" autocomplete="off" />
            <button type="submit">خمّن</button>
          </p>
        </fieldset>
      </form>
      <p><button type="button" :disabled="busy" @click="submit(true)">تخطَّ إلى التلميح التالي</button></p>
      <p><small>{{ arabicDigits(reveal) }} من {{ arabicDigits(total) }} كشوف</small></p>
    </template>

    <p class="archive"><NuxtLink v-if="date" :to="`/daily/${dayBefore(date)}`">لغز الأمس</NuxtLink></p>
  </article>
</template>

<style scoped>
.guess .row { display: flex; gap: var(--space-2xs); }
.guess input { flex: 1; min-width: 0; font-size: var(--step-1); }

.answer { font-size: var(--step-1); }
.squares { font-size: var(--step-2); letter-spacing: 0.15em; }

.archive { margin-block-start: var(--space-l); border-block-start: var(--rule); padding-block-start: var(--space-s); }
</style>
