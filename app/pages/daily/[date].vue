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

const progress = useDailyProgress()
const mine = computed(() => data.value ? progress.resultFor(data.value.date) : null)

useSeo({
  title: () => data.value ? `كلمة اليوم #${arabicDigits(data.value.number)}: ${data.value.word.headword}` : '',
  description: () => data.value ? `لغز كلمة اليوم: «${data.value.word.headword}» كما تُقال في ${data.value.forms.length} لهجات.` : '',
})
</script>

<template>
  <article v-if="data">
    <BreadCrumbs :trail="[{ label: 'كلمة اليوم', to: '/daily' }, { label: `#${arabicDigits(data.number)}` }]" />
    <hgroup class="head">
      <h1>كلمة اليوم <small>#{{ arabicDigits(data.number) }}</small></h1>
      <p v-if="mine?.correct">خمّنتها من {{ arabicDigits(mine.guesses) }} كشوف.</p>
      <p v-else-if="mine">لعبتها ولم تخمّنها.</p>
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
.answer { margin-block-start: var(--space-m); font-size: var(--step-1); }
</style>
