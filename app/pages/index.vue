<script setup lang="ts">
const searchTerm = ref('')
const router = useRouter()
const { data: dialects } = await useFetch('/api/dialects')
const { data: words } = await useFetch('/api/words', { query: { limit: 6 } })

const handleSearch = () => {
  if (searchTerm.value.trim()) router.push({ path: '/browse', query: { q: searchTerm.value.trim() } })
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero-title">كيف تقولها في لهجتك؟</h1>
      <p class="hero-description">
        كلمة واحدة بالفصحى، وعشرات الطرق لقولها من المحيط إلى الخليج. ابحث، قارن، وأضف من لهجتك.
      </p>
      <form class="search-form hero-search" @submit.prevent="handleSearch">
        <input v-model="searchTerm" type="search" placeholder="ابحث بالفصحى أو بأي لهجة…" class="search-input" />
        <button type="submit" class="search-button">بحث</button>
      </form>
    </section>

    <section class="section">
      <h2 class="section-title">اللهجات</h2>
      <div class="dialects-grid">
        <NuxtLink v-for="d in dialects" :key="d.id" :to="`/d/${d.slug}`" class="dialect-card">
          <span class="dialect-name">{{ d.nameAr }}</span>
          <span v-if="d.children.length" class="dialect-children">{{ d.children.map(c => c.nameAr).join('، ') }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">أحدث الكلمات</h2>
      <div class="words-list">
        <WordCard v-for="w in words" :key="w.id" :word="w" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: var(--ink); color: var(--sand);
  padding: 3rem 1.5rem 3.25rem; margin-bottom: 2.5rem; text-align: center;
  background-image:
    repeating-linear-gradient(45deg, transparent 0 18px, rgba(244, 238, 226, 0.05) 18px 20px),
    repeating-linear-gradient(-45deg, transparent 0 18px, rgba(244, 238, 226, 0.05) 18px 20px);
}
.hero-title { font-size: 2.8rem; font-weight: 700; margin: 0 0 0.5rem; color: #fff; }
.hero-description { max-width: 640px; margin: 0 auto 1.75rem; font-size: 1.15rem; color: var(--sand-dark); }
.hero-search { max-width: 640px; margin: 0 auto; }
.hero .search-input { border-color: var(--paper); }
.hero .search-button { background: var(--green); border-color: var(--green); color: #fff; }
.hero .search-button:hover { background: var(--red); border-color: var(--red); }

.section { margin-bottom: 2.75rem; }
.section-title {
  font-size: 1.7rem; font-weight: 700; margin-bottom: 1rem;
  border-bottom: 3px solid var(--ink); padding-bottom: 0.2rem;
}

.dialects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.75rem; }
.dialect-card {
  display: flex; flex-direction: column; gap: 0.1rem;
  background: var(--paper); border: 2px solid var(--ink); padding: 0.8rem 1rem; color: var(--ink);
  transition: background 0.15s, color 0.15s;
}
.dialect-card:hover { background: var(--green); border-color: var(--green); color: #fff; }
.dialect-name { font-size: 1.35rem; font-weight: 700; }
.dialect-children { font-size: 0.8rem; color: var(--muted); }
.dialect-card:hover .dialect-children { color: var(--sand-dark); }

.words-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
</style>
