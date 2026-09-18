<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const activeQuery = computed(() => String(route.query.q ?? '').trim())

type WordList = { id: number, headword: string, definition: string, score: number,
  entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[] }[]

let words: Ref<WordList | null | undefined>
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

useHead({ title: 'الفهرس - لهجة' })
</script>

<template>
  <article>
    <h1>الفهرس</h1>
    <p>ابحث في الأعلى بالفصحى أو بأي لهجة، أو تصفح كل الكلمات.</p>

    <p v-if="status === 'pending'" role="status">جاري البحث…</p>
    <p v-else-if="activeQuery" role="status">{{ words?.length ?? 0 }} نتيجة للبحث عن «{{ activeQuery }}»</p>

    <dl v-if="words?.length">
      <WordCard v-for="w in words" :key="w.id" :word="w" />
    </dl>
    <p v-else-if="status !== 'pending'">لا توجد نتائج.</p>
  </article>
</template>
