<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const q = ref(String(route.query.q ?? ''))

const { data: words, status } = await useFetch('/api/words', {
  query: computed(() => ({ q: String(route.query.q ?? ''), limit: 30 })),
})

const submit = () => router.push({ path: '/browse', query: q.value.trim() ? { q: q.value.trim() } : {} })
watch(() => route.query.q, v => { q.value = String(v ?? '') })
</script>

<template>
  <div>
    <h1 class="page-title">تصفح الكلمات</h1>
    <form class="search-form mb-3" @submit.prevent="submit">
      <input v-model="q" type="search" class="search-input" placeholder="ابحث بالفصحى أو بأي لهجة..." />
      <button type="submit" class="search-button">بحث</button>
    </form>

    <p v-if="route.query.q" class="muted mb-2">نتائج البحث عن «{{ route.query.q }}»</p>
    <p v-if="status === 'pending'" class="muted">جاري البحث...</p>
    <p v-else-if="!words?.length" class="muted">لا توجد نتائج.</p>
    <div v-else class="words-grid">
      <WordCard v-for="w in words" :key="w.id" :word="w" />
    </div>
  </div>
</template>

<style scoped>
.search-form { display: flex; max-width: 600px; }
.search-input { flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: 0 0.5rem 0.5rem 0; font-size: 1rem; }
.search-button { padding: 0.75rem 1.25rem; border: none; background: var(--primary-color); color: #fff; font-weight: 700; border-radius: 0.5rem 0 0 0.5rem; }
.words-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
</style>
