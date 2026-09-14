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
      <div class="hero-content">
        <h1 class="hero-title">لهجة</h1>
        <p class="hero-subtitle">قاموس اللهجات العربية</p>
        <p class="hero-description">
          اكتشف كيف تُقال الكلمة نفسها في مختلف اللهجات العربية، وشارك بكلمات من لهجتك
        </p>
        <form class="search-form" @submit.prevent="handleSearch">
          <input v-model="searchTerm" type="text" placeholder="ابحث عن كلمة بالفصحى أو بأي لهجة..." class="search-input" />
          <button type="submit" class="search-button">بحث</button>
        </form>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">تصفح حسب اللهجة</h2>
      <div class="dialects-grid">
        <NuxtLink v-for="d in dialects" :key="d.id" :to="`/d/${d.slug}`" class="dialect-card">
          <h3>{{ d.nameAr }}</h3>
          <p v-if="d.children.length" class="muted">{{ d.children.map(c => c.nameAr).join('، ') }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">أحدث الكلمات</h2>
      <div class="words-grid">
        <WordCard v-for="w in words" :key="w.id" :word="w" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, var(--primary-color), #3a5a84);
  color: #fff; border-radius: 0.75rem; padding: 3rem 1.5rem; text-align: center; margin-bottom: 2.5rem;
}
.hero-title { font-size: 3.5rem; margin: 0; }
.hero-subtitle { font-size: 1.4rem; opacity: 0.9; margin-bottom: 0.5rem; }
.hero-description { max-width: 600px; margin: 0 auto 1.5rem; opacity: 0.9; }
.search-form { display: flex; max-width: 600px; margin: 0 auto; }
.search-input {
  flex: 1; padding: 0.9rem 1rem; border: none; border-radius: 0 0.5rem 0.5rem 0; font-size: 1.1rem;
}
.search-button {
  padding: 0.9rem 1.5rem; border: none; background: var(--accent-color); color: var(--text-color);
  font-weight: 700; font-size: 1.1rem; border-radius: 0.5rem 0 0 0.5rem;
}
.section { margin-bottom: 2.5rem; }
.section-title { font-size: 1.6rem; color: var(--primary-color); margin-bottom: 1rem; }
.dialects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.dialect-card {
  background: var(--card-background); border-radius: 0.5rem; box-shadow: var(--shadow);
  padding: 1.25rem; text-align: center; color: var(--text-color); transition: transform 0.2s;
}
.dialect-card:hover { transform: translateY(-3px); color: var(--primary-color); }
.dialect-card h3 { margin-bottom: 0.25rem; }
.dialect-card p { font-size: 0.8rem; margin: 0; }
.words-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
</style>
