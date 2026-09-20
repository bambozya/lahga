<script setup lang="ts">
// A past day's puzzle (docs/REACH.md, Phase R3), solved: unlike /daily, the
// answer for a date that has already passed is not a secret, so the page
// shows it directly — real content for the archive to be indexed on, and a
// link through to the word page for whoever finds it that way.
type Puzzle = {
  date: string, number: number,
  word: { headword: string, slug: string | null, definition: string | null },
  forms: { dialect: string, nameAr: string, form: string }[]
}
const route = useRoute()
const { data, error } = await useFetch<Puzzle>(`/api/daily/${route.params.date}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'لا يوجد لغز لهذا اليوم', fatal: true })

const { resultFor } = useDailyProgress()
const mine = computed(() => data.value ? resultFor(data.value.date) : null)

useSeo({
  title: () => data.value ? `لهجة اليومية #${arabicDigits(data.value.number)}: ${data.value.word.headword}` : '',
  description: () => data.value ? `لغز لهجة اليومية: «${data.value.word.headword}» كما تُقال في ${data.value.forms.length} لهجات.` : '',
})
</script>

<template>
  <article v-if="data">
    <BreadCrumbs :trail="[{ label: 'لهجة اليومية', to: '/daily' }, { label: `#${arabicDigits(data.number)}` }]" />
    <hgroup class="head">
      <h1>لهجة اليومية <small>#{{ arabicDigits(data.number) }}</small></h1>
      <p v-if="mine">خمّنتها من {{ arabicDigits(mine.guesses) }} كشوف.</p>
    </hgroup>

    <p class="answer">
      <NuxtLink :to="`/w/${data.word.slug}`"><b>{{ data.word.headword }}</b></NuxtLink>
      <template v-if="data.word.definition"> — {{ data.word.definition }}</template>
    </p>

    <ol class="reveals">
      <li v-for="f in data.forms" :key="f.dialect">
        <b>{{ f.form }}</b> <small>{{ f.nameAr }}</small>
      </li>
    </ol>

    <p><NuxtLink to="/daily">العب لغز اليوم</NuxtLink></p>
  </article>
</template>

<style scoped>
.head > h1 { font-size: var(--step-3); }
.head > h1 small { font-size: var(--step-0); color: var(--muted); font-weight: 400; }
.head > p { margin-block-start: var(--space-2xs); color: var(--muted); font-size: var(--step--1); }
.answer { margin-block-start: var(--space-m); font-size: var(--step-1); }
.reveals { list-style: none; margin: var(--space-m) 0 0; padding: 0; }
.reveals li { border-block-start: var(--thin); padding-block: var(--space-xs); }
.reveals li:first-child { border-block-start: var(--rule); }
.reveals b { font-family: var(--naskh); font-size: var(--step-1); }
</style>
