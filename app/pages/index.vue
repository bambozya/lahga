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

const searchHeaders = useSearchHeaders()
const { data: words, status, refresh } = await useFetch<WordList>('/api/words', {
  headers: searchHeaders,
  query: computed(() => activeQuery.value
    ? { q: activeQuery.value, limit: LIMIT }
    : { random: 1, limit: SAMPLE }),
})

// The term as a dialect word in its own right (/f/…): «عيش» is answered first
// as what it means, then by the MSA words below. A form spelled like its MSA
// word (أرجوحة) would only repeat the first result, so it is left out.
const { data: formHit } = await useAsyncData('form-hit', async () => {
  const slug = activeQuery.value ? slugify(activeQuery.value) : ''
  if (!slug) return null
  const hit = await $fetch(`/api/forms/${encodeURIComponent(slug)}`).catch(() => null)
  const key = hit && formKey(hit.form)
  return hit?.senses.some(s => formKey(s.word.headword) !== key) ? hit : null
}, { watch: [activeQuery] })

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
    ? $fetch<WordList>('/api/words', { query: { q: activeQuery.value, limit: 6, fuzzy: 1 }, headers: searchHeaders })
    : Promise.resolve([])
), { watch: [words] })

// Results the looser second search found (optional ال, ت/ث and the like, see
// looseArabicPattern): none of them holds the term as it was typed. Said so,
// so a near-spelling is never passed off as the word itself.
const loose = computed(() => {
  if (!activeQuery.value || !count.value) return false
  const t = normalizeArabic(activeQuery.value)
  const has = (s: string) => normalizeArabic(s).includes(t)
  return !words.value!.some(w => has(w.headword) || w.entries.some(e => has(e.form)))
})

// «ليست الكلمة التي أبحث عنها»: the search found words, but not the one meant.
// Only the searcher can tell a near-spelling from a word we lack, so they say
// so, and the term joins the missing words (POST /api/search-misses).
const reportedFor = ref<string | null>(null)
const reporting = ref(false)
const reportFailed = ref(false)
const report = async () => {
  reporting.value = true; reportFailed.value = false
  try {
    await $fetch('/api/search-misses', { method: 'POST', body: { q: activeQuery.value }, headers: searchHeaders })
    reportedFor.value = activeQuery.value
  }
  catch { reportFailed.value = true }
  finally { reporting.value = false }
}

// Arabic counts the way Arabic counts: one, two, a few, many.
const countLabel = computed(() => {
  const n = count.value
  if (n === 0) return 'لا نتائج'
  if (n === 1) return 'نتيجة واحدة'
  if (n === 2) return 'نتيجتان'
  if (n === LIMIT) return `أول ${n} نتيجة`
  return n <= 10 ? `${n} نتائج` : `${n} نتيجة`
})

// The page's own name for itself, in words a stranger would search for: the
// heading says what the site is, and the line under it carries the numbers
// (docs/DISCOVERY.md). The random words below change on every load, so this
// is the only text on the page a crawler finds the same twice.
const size = useDictionarySize()

useSeo({
  title: () => activeQuery.value ? `بحث: ${activeQuery.value}` : 'معجم اللهجات العربية',
  path: '/',
  description: () => activeQuery.value
    ? `نتائج البحث عن «${activeQuery.value}» في معجم اللهجات العربية.`
    : 'معجم تشاركي للهجات العربية: ابحث عن كلمة بالفصحى أو بأي لهجة وشاهد كيف تُقال في مصر والشام والخليج والعراق واليمن والمغرب والسودان.',
  noindex: () => !!activeQuery.value,
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'لهجة',
    // The English name is for answer engines asked in English; the site
    // itself stays Arabic only.
    alternateName: ['لهجة، معجم اللهجات العربية', 'معجم لهجة', 'lahga.fyi', 'Lahga', 'Lahga, a dictionary of Arabic dialects'],
    url: 'https://lahga.fyi/',
    inLanguage: 'ar',
    description: 'معجم تشاركي مفتوح للهجات العربية، يربط كلمات كل لهجة بمعانيها بالفصحى.',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    isAccessibleForFree: true,
    about: {
      '@type': 'Thing',
      name: 'اللهجات العربية',
      sameAs: ['https://ar.wikipedia.org/wiki/لهجات_عربية', 'https://en.wikipedia.org/wiki/Varieties_of_Arabic'],
    },
    sameAs: ['https://github.com/bambozya/lahga'],
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
      <h1>معجم اللهجات العربية</h1>
      <p v-if="size.ready.value && size.dialects.value">
        «لهجة» معجم تشاركي مفتوح: أكثر من {{ size.words.value }} كلمة بالفصحى
        و{{ size.entries.value }} مرادف لها في {{ size.dialects.value }} لهجة عربية.
        ابحث في الأعلى بالفصحى أو بأي لهجة، أو اقرأ ما وقعت عليه القرعة.
      </p>
      <p v-else>
        «لهجة» معجم تشاركي مفتوح يجمع كيف تُقال الكلمة الواحدة في اللهجات العربية.
        ابحث في الأعلى بالفصحى أو بأي لهجة، أو اقرأ ما وقعت عليه القرعة.
      </p>
    </hgroup>

    <!-- Another way to read the same list, offered where the choice is made:
         the ranking belongs to the words, not beside them in the header. -->
    <p v-if="!activeQuery" class="ranking">
      <NuxtLink to="/divergent">اقرأ الكلمات التي تختلف عليها اللهجات أكثر</NuxtLink> ·
      <NuxtLink to="/games">أو العب</NuxtLink>
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
        <NuxtLink class="cta" :to="{ path: '/add-word', query: { headword: activeQuery } }">أضف «{{ activeQuery }}» إلى المعجم</NuxtLink>
      </p>
      <p><small><NuxtLink to="/" aria-current-value="false">اقرأ كلمات أخرى</NuxtLink> · <NuxtLink to="/dialects">تصفّح اللهجات</NuxtLink></small></p>
    </div>

    <template v-else-if="words?.length">
      <p v-if="loose" class="loose">لم نجد «{{ activeQuery }}» بهذا الإملاء، فهذه أقرب الكلمات إليها.</p>
      <dl :aria-busy="shuffling">
        <FormCard v-if="formHit && activeQuery" :form="formHit" />
        <WordCard v-for="w in words" :key="w.id" :word="w" />
      </dl>
      <!-- A result is not always the word: a near-spelling or a homograph can
           stand in for one we lack. The searcher gets the last word. -->
      <p v-if="activeQuery && !searching" class="not-it">
        <small v-if="reportedFor === activeQuery">
          شكراً، سجّلنا «{{ activeQuery }}» كلمةً ناقصة.
          <NuxtLink :to="{ path: '/add-word', query: { headword: activeQuery } }">أو أضفها بنفسك</NuxtLink>
        </small>
        <small v-else>
          ليست الكلمة التي تبحث عنها؟
          <button type="button" class="as-link" :disabled="reporting" @click="report">أخبرنا أنها ناقصة</button>
          · <NuxtLink :to="{ path: '/add-word', query: { headword: activeQuery } }">أضفها بنفسك</NuxtLink>
          <template v-if="reportFailed"> · تعذّر الإرسال، حاول مرة أخرى.</template>
        </small>
      </p>
    </template>
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

/* Found by the looser spelling: a note above the results, not a warning. */
.loose { margin-block-start: var(--space-s); color: var(--muted); font-size: var(--step--1); }
/* Below the results, quiet: most searches find their word and never need it. */
.not-it { margin-block-start: var(--space-m); color: var(--muted); }
.as-link {
  background: none; border: 0; padding: 0; font: inherit; color: var(--accent);
  text-decoration: underline; cursor: pointer;
}
.as-link:disabled { opacity: .6; cursor: default; }
</style>
