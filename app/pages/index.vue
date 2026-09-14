<script setup lang="ts">
const { data: entries } = await useFetch('/api/entries', { query: { limit: 20 } })
const { data: dialects } = await useFetch('/api/dialects')
</script>

<template>
  <div class="home">
    <section class="feed">
      <EntryCard v-for="e in entries" :key="e.id" :entry="e" />
      <p v-if="!entries?.length" class="muted">لا توجد كلمات بعد.</p>
    </section>

    <aside class="side">
      <h2 class="section-title">اللهجات</h2>
      <ul class="dialect-list">
        <li v-for="d in dialects" :key="d.id">
          <NuxtLink :to="`/d/${d.slug}`">{{ d.nameAr }}</NuxtLink>
          <span v-if="d.children.length" class="sub">
            <NuxtLink v-for="c in d.children" :key="c.id" :to="`/d/${c.slug}`">{{ c.nameAr }}</NuxtLink>
          </span>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
.home { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: var(--space-xl); }
.dialect-list { list-style: none; padding: 0; margin: 0; }
.dialect-list li { margin-bottom: var(--space-2xs); line-height: 1.5; }
.dialect-list li > a { font-family: var(--font-display); font-size: var(--step-1); color: var(--ink); }
.dialect-list li > a:hover { color: var(--red); }
.sub { display: block; font-size: var(--step--2); color: var(--muted); }
.sub a { color: var(--muted); }
.sub a:hover { color: var(--red); }
.sub a + a::before { content: '،'; margin-inline-end: 0.25em; color: var(--faint); }
@media (max-width: 760px) {
  .home { grid-template-columns: 1fr; gap: var(--space-l); }
}
</style>
