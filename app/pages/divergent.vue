<script setup lang="ts">
// The dictionary ranked by its own standard (docs/REACH.md, Phase R4): the
// words the dialects disagree about most. Not a new kind of content — the
// content rule already says a word earns a page only if dialects say it
// differently, so this is the same dictionary sorted by how much of that is
// true, and the most interesting thing the site owns to look at in one screen.
//
// Every form is shown inline, so the page reads whole without clicking into a
// single word. That is the point: it is meant to be read, and screenshotted,
// as it stands.
type Divergent = {
  id: number, headword: string, definition: string | null,
  forms: number, groups: number, score: number,
  entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[]
}[]

type Pairs = { a: { slug: string, nameAr: string }, b: { slug: string, nameAr: string }, shared: number }[]

const [{ data: words }, { data: pairs }] = await Promise.all([
  useFetch<Divergent>('/api/divergent', { query: { limit: 50 } }),
  useFetch<Pairs>('/api/dialect-pairs', { query: { limit: 10 } }),
])

const arabicDigits = (n: number) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]!)
// «١٨ صيغة في ١٠ لهجات» — the evidence behind a word's place in the ranking.
const note = (w: Divergent[number]) =>
  `${arabicDigits(w.forms)} صيغة في ${arabicDigits(w.groups)} لهجات`

useSeo({
  title: 'الكلمات التي تختلف عليها اللهجات أكثر',
  description: 'ترتيب كلمات القاموس بحسب اختلاف اللهجات عليها: الكلمات التي لكل لهجة فيها كلمة أخرى، من الأكثر اختلافاً إلى الأقل.',
  path: '/divergent',
  image: '/og/divergent.png',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الأكثر اختلافاً' }]" />
    <hgroup class="head">
      <h1>الكلمات التي تختلف عليها اللهجات أكثر</h1>
      <p>لكل لهجة فيها كلمة أخرى. مرتّبة من الأكثر اختلافاً: عدد الصيغ المختلفة مقسوماً على عدد اللهجات التي تقولها.</p>
    </hgroup>

    <dl v-if="words?.length">
      <WordCard v-for="w in words" :key="w.id" :word="w" :note="note(w)" />
    </dl>
    <p v-else>لا توجد كلمات كافية بعد لبناء هذا الترتيب.</p>

    <!-- One word at a time is one argument; two dialects at a time is the other. -->
    <section v-if="pairs?.length" class="pairs">
      <h2>قارن لهجتين</h2>
      <ul>
        <li v-for="p in pairs" :key="`${p.a.slug}-${p.b.slug}`">
          <NuxtLink :to="`/d/${p.a.slug}/vs/${p.b.slug}`">{{ p.a.nameAr }} و{{ p.b.nameAr }}</NuxtLink>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
/* The title carries the page; the line under it explains the ranking once. */
.head > h1 { font-size: var(--step-3); line-height: 1.25; }
.head > p { margin-block-start: var(--space-2xs); color: var(--muted); font-size: var(--step--1); max-width: var(--measure); }
/* The pair list closes the page the way the dice close a list of words. */
.pairs { border-block-start: var(--rule); padding-block-start: var(--space-m); margin-block-start: var(--space-l); }
.pairs h2 { font: 700 var(--step-0)/1.6 var(--naskh); color: var(--muted); }
.pairs ul { display: flex; flex-wrap: wrap; gap: var(--space-2xs) var(--space-s); list-style: none; padding: 0; margin-block-start: var(--space-xs); }
</style>
