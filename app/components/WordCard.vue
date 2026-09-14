<script setup lang="ts">
defineProps<{
  word: {
    id: number
    headword: string
    definition: string
    entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[]
  }
}>()
</script>

<template>
  <article class="card word-card">
    <NuxtLink :to="`/w/${word.id}`" class="headword">{{ word.headword }}</NuxtLink>
    <p class="definition">{{ word.definition }}</p>
    <ul class="forms">
      <li v-for="e in word.entries.slice(0, 6)" :key="e.id">
        <span class="form">{{ e.form }}</span>
        <span class="dialect-tag">{{ e.dialect.nameAr }}</span>
      </li>
      <li v-if="word.entries.length > 6" class="more">
        <NuxtLink :to="`/w/${word.id}`">و{{ word.entries.length - 6 }} أخرى</NuxtLink>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.word-card { display: flex; flex-direction: column; border-inline-start-width: 8px; border-inline-start-color: var(--green); }
.headword { font-size: 2.1rem; font-weight: 700; color: var(--ink); line-height: 1.2; }
.headword:hover { color: var(--red); }
.definition { color: var(--muted); margin: 0.25rem 0 0.9rem; }
.forms { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
.forms li { display: flex; align-items: center; gap: 0.4rem; }
.form { font-weight: 700; font-size: 1.15rem; }
.more a { font-weight: 700; }
</style>
