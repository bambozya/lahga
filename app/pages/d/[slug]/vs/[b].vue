<script setup lang="ts">
// Two dialects side by side (docs/REACH.md, Phase R4): only the words they say
// differently, because the words they agree on are not what anyone came to
// argue about.
const route = useRoute()
const a = computed(() => String(route.params.slug))
const b = computed(() => String(route.params.b))

type Comparison = {
  a: { slug: string, nameAr: string }
  b: { slug: string, nameAr: string }
  shared: number
  enoughToIndex: boolean
  words: { headword: string, definition: string | null, a: string[], b: string[] }[]
}

const { data: cmp, error } = await useFetch<Comparison>(`/api/compare/${a.value}/${b.value}`)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'المقارنة غير متاحة', fatal: true })
}

const arabicDigits = (n: number) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]!)

useSeo({
  title: () => cmp.value ? `الفرق بين ${cmp.value.a.nameAr} و${cmp.value.b.nameAr}` : '',
  description: () => cmp.value
    ? `الكلمات التي تقولها ${cmp.value.a.nameAr} بشكل وتقولها ${cmp.value.b.nameAr} بشكل آخر، جنباً إلى جنب.`
    : '',
  path: () => `/d/${a.value}/vs/${b.value}`,
  // A pair with too little in common would be a thin page, and a field of thin
  // pages drags the rest of the site down in search: it still answers, it just
  // asks not to be listed.
  noindex: () => !cmp.value?.enoughToIndex,
})
</script>

<template>
  <article v-if="cmp">
    <hgroup class="head">
      <p><NuxtLink :to="`/d/${cmp.a.slug}`">{{ cmp.a.nameAr }}</NuxtLink> · <NuxtLink :to="`/d/${cmp.b.slug}`">{{ cmp.b.nameAr }}</NuxtLink></p>
      <h1>الفرق بين {{ cmp.a.nameAr }} و{{ cmp.b.nameAr }}</h1>
      <p v-if="cmp.words.length">
        من {{ arabicDigits(cmp.shared) }} كلمة تقولها اللهجتان،
        تختلفان في {{ arabicDigits(cmp.words.length) }}.
      </p>
      <p v-else>لا اختلاف مسجّلاً بين اللهجتين بعد.</p>
    </hgroup>

    <table v-if="cmp.words.length">
      <thead>
        <tr>
          <th>بالفصحى</th>
          <th>{{ cmp.a.nameAr }}</th>
          <th>{{ cmp.b.nameAr }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="w in cmp.words" :key="w.headword">
          <th scope="row">{{ w.headword }}</th>
          <td>{{ w.a.join('، ') }}</td>
          <td>{{ w.b.join('، ') }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.head > h1 { font-size: var(--step-3); line-height: 1.25; }
.head > p { color: var(--muted); font-size: var(--step--1); }
.head > p:last-child { margin-block-start: var(--space-2xs); }
/* The two dialects carry equal weight: neither column is the answer. */
td { font-family: var(--naskh); font-size: var(--step-0); }
</style>
