<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const q = ref(String(route.query.q ?? ''))
const activeQuery = computed(() => String(route.query.q ?? '').trim())

type WordList = { id: number, headword: string, definition: string, score: number,
  entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[] }[]

let words: Ref<WordList | null>
let status: Ref<string>

if (config.public.staticSite) {
  // Static build (GitHub Pages): no server to search, so filter the full list in the browser.
  const { data: all, status: s } = await useFetch<WordList>('/api/words/all', { responseType: 'json' })
  status = s
  words = computed(() => {
    const term = normalizeArabic(activeQuery.value)
    const list = all.value ?? []
    if (!term) return list
    return list.filter(w =>
      normalizeArabic(w.headword).includes(term)
      || w.entries.some(e => normalizeArabic(e.form).includes(term)),
    )
  })
} else {
  const res = await useFetch<WordList>('/api/words', {
    query: computed(() => ({ q: activeQuery.value, limit: 30 })),
  })
  words = res.data
  status = res.status
}

const submit = () => router.push({ path: '/browse', query: q.value.trim() ? { q: q.value.trim() } : {} })
watch(() => route.query.q, v => { q.value = String(v ?? '') })
</script>

<template>
  <div>
    <h1 class="page-title">الفهرس</h1>
    <form class="search-form browse-search mb-3" @submit.prevent="submit">
      <input v-model="q" type="search" class="search-input" placeholder="ابحث بالفصحى أو بأي لهجة..." />
      <button type="submit" class="search-button">بحث</button>
    </form>

    <p v-if="activeQuery" class="muted mb-2">نتائج البحث عن «{{ activeQuery }}»</p>
    <p v-if="status === 'pending'" class="muted">جاري البحث...</p>
    <p v-else-if="!words?.length" class="muted">لا توجد نتائج.</p>
    <div v-else class="results">
      <WordCard v-for="w in words" :key="w.id" :word="w" />
    </div>
  </div>
</template>

<style scoped>
.browse-search { max-width: 520px; }
.browse-search .search-input { padding: 0.55rem 0.9rem; font-size: 1.1rem; }
.browse-search .search-button { padding: 0.55rem 1.2rem; }
.results { max-width: 720px; }
</style>
