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
  <article class="word-card">
    <div class="head">
      <NuxtLink :to="`/w/${word.id}`" class="lemma">{{ word.headword }}</NuxtLink>
      <span class="row-label">بالفصحى</span>
    </div>
    <p class="definition">{{ word.definition }}</p>
    <p class="forms">
      <span v-for="e in word.entries" :key="e.id" class="form-item">
        <span class="form">{{ e.form }}</span>
        <NuxtLink :to="`/d/${e.dialect.slug}`" class="pill">{{ e.dialect.nameAr }}</NuxtLink>
      </span>
    </p>
  </article>
</template>

<style scoped>
.word-card { margin-bottom: 2rem; }
.head { display: flex; align-items: baseline; gap: 0.6rem; }
.definition { color: var(--muted); margin: 0.35rem 0 0.4rem; }
.forms { margin: 0; display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; }
.form-item { display: inline-flex; align-items: baseline; gap: 0.35rem; }
.form { font-weight: 700; font-size: 1.1rem; }
</style>
