<script setup lang="ts">
const route = useRoute()
const activeQuery = computed(() => String(route.query.q ?? '').trim())

type WordList = { id: number, headword: string, definition: string, score: number,
  entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[] }[]

const { data: words, status } = await useFetch<WordList>('/api/words', {
  query: computed(() => ({ q: activeQuery.value, limit: 30 })),
})

useSeo({
  title: () => activeQuery.value ? `بحث: ${activeQuery.value}` : 'فهرس الكلمات',
  description: () => activeQuery.value
    ? `نتائج البحث عن «${activeQuery.value}» في قاموس اللهجات العربية.`
    : 'كل كلمات القاموس: الكلمة بالفصحى ومقابلها في كل لهجة عربية، من المصري والشامي والخليجي إلى المغاربي والسوداني.',
  noindex: () => !!activeQuery.value,
})
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
