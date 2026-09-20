<script setup lang="ts">
// «من أي لهجة؟» (docs/REACH.md, Phase R3): three multiple-choice rounds a day,
// each asking which dialect group says a given form. Unlike لهجة اليوم there is
// nothing to reveal gradually — one guess ends a round either way — so the
// game is just three quick questions and a score out of three.
type Choice = { id: number, nameAr: string }
type Round = { date: string, slot: number, total: number, form: string, word: { headword: string, definition: string | null }, choices: Choice[] }
const { data: initial } = await useFetch<Round>('/api/dialect-quiz', { query: { slot: 1 } })

const { recordResult, playedToday, resultFor } = useDialectQuizProgress()

const date = computed(() => initial.value?.date ?? '')
const total = computed(() => initial.value?.total ?? 3)
const round = ref<Round | null>(initial.value ?? null)
const scores = ref<boolean[]>([])

const answered = ref(false)
const selectedId = ref<number | null>(null)
type Feedback = { correct: boolean, correctGroupId: number, correctNameAr: string, word: { headword: string, slug: string | null } }
const feedback = ref<Feedback | null>(null)

const busy = ref(false)
const failure = ref('')

type FinalResult = { correct: number, total: number }
const finalResult = ref<FinalResult | null>(null)

onMounted(() => {
  if (!date.value) return
  if (playedToday(date.value)) finalResult.value = resultFor(date.value)
})

const choose = async (groupId: number) => {
  if (answered.value || busy.value || !round.value) return
  busy.value = true
  failure.value = ''
  try {
    const data = await $fetch('/api/dialect-quiz/guess', { method: 'POST', body: { slot: round.value.slot, groupId } })
    selectedId.value = groupId
    feedback.value = data
    answered.value = true
    scores.value = [...scores.value, data.correct]
  } catch (e: any) {
    failure.value = e?.data?.statusMessage || 'تعذر إرسال الإجابة'
  } finally {
    busy.value = false
  }
}

const next = async () => {
  if (scores.value.length >= total.value) {
    const result = { correct: scores.value.filter(Boolean).length, total: total.value }
    finalResult.value = result
    recordResult(date.value, result)
    return
  }
  busy.value = true
  failure.value = ''
  try {
    round.value = await $fetch<Round>('/api/dialect-quiz', { query: { slot: round.value!.slot + 1 } })
    answered.value = false
    selectedId.value = null
    feedback.value = null
  } catch (e: any) {
    failure.value = e?.data?.statusMessage || 'تعذر تحميل الجولة التالية'
  } finally {
    busy.value = false
  }
}

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
const shared = ref(false)
const share = async () => {
  try {
    const canShareFiles = typeof navigator.canShare === 'function'
    if (canShareFiles && cardUrl.value) {
      const blob = await $fetch<Blob>(cardUrl.value, { responseType: 'blob' })
      const file = new File([blob], 'lahga-which-dialect.png', { type: 'image/png' })
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
  title: 'من أي لهجة؟',
  description: 'ثلاث جولات كل يوم: كلمة كما تُقال في لهجة ما، وأربعة خيارات — خمّن أيّ لهجة تكون. لعبة يومية جديدة كل يوم، بلا حساب.',
  path: '/which-dialect',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'ألعاب', to: '/games' }, { label: 'من أي لهجة؟' }]" />
    <hgroup class="head">
      <h1>من أي لهجة؟</h1>
      <p>كلمة كما تُقال في لهجة ما — أيّ لهجة تكون؟</p>
    </hgroup>

    <template v-if="finalResult">
      <div class="end" role="status">
        <p>{{ arabicDigits(finalResult.correct) }}/{{ arabicDigits(finalResult.total) }} إجابات صحيحة اليوم.</p>
        <p v-if="cardUrl" class="card">
          <img :src="cardUrl" alt="بطاقة نتيجة من أي لهجة؟" width="270" height="338" loading="lazy" />
        </p>
        <p>
          <button type="button" @click="share">{{ shared ? 'تم' : 'شارك النتيجة' }}</button>
          <a v-if="cardUrl" :href="cardUrl" download="lahga-which-dialect.png" class="cta">نزّل الصورة</a>
          <NuxtLink to="/daily" class="cta">العب لهجة اليوم</NuxtLink>
        </p>
      </div>
    </template>
    <template v-else-if="round">
      <p role="alert" v-if="failure">{{ failure }}</p>
      <p class="progress"><small>جولة {{ arabicDigits(round.slot) }} من {{ arabicDigits(total) }}</small></p>

      <div class="question">
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

      <div v-if="answered && feedback" class="feedback" role="status">
        <p v-if="feedback.correct">صحيح!</p>
        <p v-else>غير صحيح. الإجابة: <b>{{ feedback.correctNameAr }}</b></p>
        <p><NuxtLink v-if="feedback.word.slug" :to="`/w/${feedback.word.slug}`">افتح صفحة «{{ feedback.word.headword }}»</NuxtLink></p>
        <p><button type="button" :disabled="busy" @click="next">{{ round.slot >= total ? 'النتيجة النهائية' : 'الجولة التالية' }}</button></p>
      </div>
    </template>
  </article>
</template>

<style scoped>
.head > h1 { font-size: var(--step-3); }
.head > p { margin-block-start: var(--space-2xs); color: var(--muted); font-size: var(--step--1); }

.progress { margin-block-start: var(--space-m); }
.question { margin-block-start: var(--space-s); border-block-end: var(--rule); padding-block-end: var(--space-m); }
.question .context { color: var(--muted); font-size: var(--step--1); }
.question .form { margin-block-start: var(--space-xs); font: 700 var(--step-4)/1.3 var(--naskh); }

.choices { list-style: none; margin: var(--space-m) 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); }
.choices button { width: 100%; }
.choices button.chosen { border-color: var(--ink); }
.choices button.correct { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.choices button.wrong { text-decoration: line-through; opacity: 0.7; }

.feedback { margin-block-start: var(--space-m); }

.end { margin-block-start: var(--space-m); padding: var(--space-m); border: var(--thin); border-inline-start: 6px solid var(--accent); border-radius: var(--radius); }
.end .card img { display: block; margin-block-start: var(--space-s); border: var(--thin); border-radius: var(--radius); }
.end .cta { margin-inline-start: var(--space-s); }
</style>
