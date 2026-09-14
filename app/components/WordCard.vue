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
      <li v-if="word.entries.length > 6" class="muted">و{{ word.entries.length - 6 }} أخرى…</li>
    </ul>
  </article>
</template>

<style scoped>
.headword { font-size: 1.6rem; font-weight: 700; }
.definition { color: var(--light-text); margin: 0.25rem 0 0.75rem; }
.forms { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.forms li { display: flex; align-items: center; gap: 0.35rem; }
.form { font-weight: 500; }
</style>
