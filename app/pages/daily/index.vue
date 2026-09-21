<script setup lang="ts">
// «كلمة اليوم» (docs/REACH.md, Phase R3): one word, revealed one dialect at a
// time, hardest form first. No account, no server-side session — progress and
// the streak live in the browser (useDailyProgress), and the answer is never
// in the page payload until the round is over: it is checked by
// POST /api/daily/guess, not read out of a devtools tab.
//
// The initial form renders from a real server fetch, so the puzzle itself
// shows without JS; submitting a guess needs it, the same trade the vote and
// contribute forms already make elsewhere on the site.
type Form = { dialect: string, nameAr: string, form: string }
const { data: initial } = await useFetch('/api/daily', { query: { reveal: 1 } })

const { recordResult, playedToday, resultFor } = useDailyProgress()

const date = computed(() => initial.value?.date ?? '')
const number = computed(() => initial.value?.number ?? 0)
const total = computed(() => initial.value?.total ?? REVEALS)
const forms = ref<Form[]>(initial.value?.forms ?? [])
const reveal = ref(forms.value.length || 1)

const guess = ref('')
const busy = ref(false)
const failure = ref('')

type Result = { correct: boolean, guesses: number, word: { headword: string, slug: string | null, definition: string | null } }
const result = ref<Result | null>(null)
const finished = computed(() => !!result.value)

// A round already played today (tracked locally) shows its saved result
// straight away, with no second request — the answer was cached at the time,
// not fetched again just to redisplay it.
onMounted(() => {
  if (!date.value) return
  if (playedToday(date.value)) {
    const saved = resultFor(date.value)!
    result.value = { correct: saved.correct, guesses: saved.guesses, word: saved.word }
  }
})

const submit = async (skip: boolean) => {
  if (busy.value || finished.value) return
  busy.value = true
  failure.value = ''
  try {
    const data = await $fetch('/api/daily/guess', {
      method: 'POST',
      body: { guess: skip ? '' : guess.value, reveal: reveal.value },
    })
    guess.value = ''
    if ('word' in data) {
      result.value = data
      recordResult(date.value, data)
    } else if (data.next) {
      forms.value = [...forms.value, data.next]
      reveal.value += 1
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
// played yet. Shown inline and offered as a real image, not only as text,
// since WhatsApp — where this is actually going to move — moves pictures.
const cardUrl = computed(() => {
  if (!date.value || !result.value) return ''
  const q = new URLSearchParams({
    date: date.value, guesses: String(result.value.guesses),
    correct: result.value.correct ? '1' : '0', total: String(total.value),
  })
  return `/og/daily-result.png?${q}`
})
const shared = ref(false)
const share = async () => {
  try {
    // A real share sheet with the image attached where the browser supports
    // sharing files; otherwise the result line, copied, is the fallback —
    // the image stays visible on the page either way, for a manual save.
    const canShareFiles = typeof navigator.canShare === 'function'
    if (canShareFiles && cardUrl.value) {
      const blob = await $fetch<Blob>(cardUrl.value, { responseType: 'blob' })
      const file = new File([blob], 'lahga-daily.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText.value })
        shared.value = true
        return
      }
    }
    if (navigator.share) await navigator.share({ text: shareText.value })
    else await navigator.clipboard.writeText(shareText.value)
    shared.value = true
  } catch { /* the visitor cancelled the share sheet — not a failure */ }
}

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

    <template v-if="finished && result">
      <div class="end" role="status">
        <p v-if="result.correct">أحسنت! خمّنتها من {{ arabicDigits(result.guesses) }} كشوف.</p>
        <p v-else>لم تُخمَّن اليوم. الكلمة كانت:</p>
        <p class="answer">
          <NuxtLink :to="`/w/${result.word.slug}`"><b>{{ result.word.headword }}</b></NuxtLink>
          <template v-if="result.word.definition"> — {{ result.word.definition }}</template>
        </p>
        <p class="squares" dir="ltr">{{ arSquares }}</p>
        <p v-if="cardUrl" class="card">
          <img :src="cardUrl" alt="بطاقة نتيجة كلمة اليوم" width="270" height="338" loading="lazy" />
        </p>
        <p>
          <button type="button" @click="share">{{ shared ? 'تم' : 'شارك النتيجة' }}</button>
          <a v-if="cardUrl" :href="cardUrl" download="lahga-daily.png" class="cta">نزّل الصورة</a>
          <NuxtLink :to="`/w/${result.word.slug}`" class="cta">افتح صفحة الكلمة</NuxtLink>
        </p>
      </div>
    </template>
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
.head > h1 { font-size: var(--step-3); }
.head > h1 small { font-size: var(--step-0); color: var(--muted); font-weight: 400; }
.head > p { margin-block-start: var(--space-2xs); color: var(--muted); font-size: var(--step--1); max-width: var(--measure); }

.reveals { list-style: none; margin: var(--space-m) 0 0; padding: 0; }
.reveals li { border-block-start: var(--thin); padding-block: var(--space-xs); }
.reveals li:first-child { border-block-start: var(--rule); }
.reveals b { font-family: var(--naskh); font-size: var(--step-1); }

.guess .row { display: flex; gap: var(--space-2xs); }
.guess input { flex: 1; min-width: 0; font-size: var(--step-1); }

.end { margin-block-start: var(--space-m); padding: var(--space-m); background: var(--surface, transparent); border: var(--thin); border-inline-start: 6px solid var(--accent); border-radius: var(--radius); }
.end .answer { font-size: var(--step-1); }
.end .squares { font-size: var(--step-2); letter-spacing: 0.15em; }
.end .card img { display: block; margin-block: var(--space-s); border: var(--thin); border-radius: var(--radius); }
.end .cta { margin-inline-start: var(--space-s); }

.archive { margin-block-start: var(--space-l); border-block-start: var(--rule); padding-block-start: var(--space-s); }
</style>
