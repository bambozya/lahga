<script setup lang="ts">
// The home page is the dictionary itself: the search results when something is
// being looked for, a handful of words drawn at random otherwise. Nothing stands
// between the search box in the header and the answer — one column, and no
// sidebar beside it repeating the «اللهجات» link the header already carries.
//
// Five random words rather than the whole index: anyone looking for a word types
// it in the box above, so the page is free to be an invitation instead of a
// list — five words to read, and dice to draw five more.
const route = useRoute()
const activeQuery = computed(() => String(route.query.q ?? '').trim())
const LIMIT = 50
const SAMPLE = 5

type WordList = { id: number, slug: string, headword: string, definition: string | null, score: number,
  entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[] }[]

const { data: words, status, refresh } = await useFetch<WordList>('/api/words', {
  query: computed(() => activeQuery.value
    ? { q: activeQuery.value, limit: LIMIT }
    : { random: 1, limit: SAMPLE }),
})

const count = computed(() => words.value?.length ?? 0)
const searching = computed(() => status.value === 'pending')
const shuffling = computed(() => !activeQuery.value && status.value === 'pending')
const nothing = computed(() => !!activeQuery.value && !searching.value && count.value === 0)

// Aggregate count in the analytics dashboard; the actual missed terms are logged
// server-side (see logSearchMiss in the /api/words handler) and read at
// /admin/search-misses — kept out of this event so a search term is never a
// public-analytics prop.
const { trackEvent } = useAnalytics()
watch(nothing, v => { if (v) trackEvent('search-empty') })

// A search that found nothing asks once more for the nearest words, so the
// empty answer can still point somewhere («هل تقصد…»).
const { data: suggestions } = await useAsyncData<WordList>('near', () => (
  activeQuery.value && !count.value
    ? $fetch<WordList>('/api/words', { query: { q: activeQuery.value, limit: 6, fuzzy: 1 } })
    : Promise.resolve([])
), { watch: [words] })

// Arabic counts the way Arabic counts: one, two, a few, many.
const countLabel = computed(() => {
  const n = count.value
  if (n === 0) return 'لا نتائج'
  if (n === 1) return 'نتيجة واحدة'
  if (n === 2) return 'نتيجتان'
  if (n === LIMIT) return `أول ${n} نتيجة`
  return n <= 10 ? `${n} نتائج` : `${n} نتيجة`
})

useSeo({
  title: () => activeQuery.value ? `بحث: ${activeQuery.value}` : 'قاموس اللهجات العربية',
  path: '/',
  description: () => activeQuery.value
    ? `نتائج البحث عن «${activeQuery.value}» في قاموس اللهجات العربية.`
    : 'قاموس تشاركي للهجات العربية: ابحث عن كلمة بالفصحى أو بأي لهجة وشاهد كيف تُقال في مصر والشام والخليج والعراق واليمن والمغرب والسودان.',
  noindex: () => !!activeQuery.value,
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'لهجة',
    alternateName: 'لهجة، قاموس اللهجات العربية',
    url: 'https://lahga.fyi/',
    inLanguage: 'ar',
    description: 'قاموس تشاركي يربط كلمات اللهجات العربية بمعانيها بالفصحى.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://lahga.fyi/?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  }],
})
</script>

<template>
  <article>
    <!-- Searching: one quiet line, then the results. -->
    <hgroup v-if="activeQuery" class="head">
      <h1>«{{ activeQuery }}»</h1>
      <p role="status">{{ searching ? 'جاري البحث…' : countLabel }}</p>
    </hgroup>
    <hgroup v-else class="head">
      <h1>كلمات من القاموس</h1>
      <p>ابحث في الأعلى بالفصحى أو بأي لهجة، أو اقرأ ما وقعت عليه القرعة.</p>
    </hgroup>

    <!-- Another way to read the same list, offered where the choice is made:
         the ranking belongs to the words, not beside them in the header. -->
    <p v-if="!activeQuery" class="ranking">
      <NuxtLink to="/daily">أو العب لهجة اليومية</NuxtLink> ·
      <NuxtLink to="/divergent">اقرأ الكلمات التي تختلف عليها اللهجات أكثر</NuxtLink>
    </p>

    <!-- Nothing found: not a line of text like any other, but a door. -->
    <div v-if="nothing" class="empty">
      <h2>لم نجد «{{ activeQuery }}»</h2>
      <p>لا شيء بعد بهذا الاسم. ربما تُكتب بحروف أخرى، أو لم يضفها أحد بعد — وهنا يأتي دورك.</p>
      <p v-if="suggestions?.length" class="near">
        هل تقصد:
        <template v-for="(w, i) in suggestions" :key="w.id">
          <template v-if="i">، </template><NuxtLink :to="`/w/${w.slug}`">{{ w.headword }}</NuxtLink>
        </template>
      </p>
      <p>
        <NuxtLink class="cta" :to="{ path: '/add-word', query: { headword: activeQuery } }">أضف «{{ activeQuery }}» إلى القاموس</NuxtLink>
      </p>
      <p><small><NuxtLink to="/" aria-current-value="false">اقرأ كلمات أخرى</NuxtLink> · <NuxtLink to="/dialects">تصفّح اللهجات</NuxtLink></small></p>
    </div>

    <dl v-else-if="words?.length" :aria-busy="shuffling">
      <WordCard v-for="w in words" :key="w.id" :word="w" />
    </dl>
    <p v-else-if="!searching">لا توجد كلمات بعد.</p>

    <!-- Nothing to shuffle while a search is on screen: the dice belong to
         the random handful, not to someone's results. -->
    <ShuffleButton v-if="!activeQuery && words?.length" label="كلمات أخرى" :busy="shuffling" @shuffle="refresh" />
  </article>
</template>

<style scoped>
/* The search state wastes no height: the query is a line, not a banner. */
.head > h1 { font-size: var(--step-2); }
.head > p { margin-block-start: var(--space-3xs); }
/* An aside, not a heading: the other way to read the list, offered quietly. */
.ranking { margin-block-start: var(--space-2xs); font-size: var(--step--1); }
/* The result count is a whisper; only the empty state raises its voice. */
.head > p[role="status"] {
  background: none; border: 0; padding: 0;
  font: 400 var(--step--1)/1.6 var(--sans); color: var(--muted);
}

/* Nothing found: a bordered panel, so it can never be mistaken for a result. */
.empty {
  margin-block-start: var(--space-m);
  padding: var(--space-m) var(--space-s-m);
  background: var(--surface);
  border: var(--thin); border-inline-start: 6px solid var(--accent); border-radius: var(--radius);
}
.empty > * + * { margin-block-start: var(--space-s); }
.empty h2 { font-size: var(--step-1); }
.near { color: var(--muted); }
</style>
