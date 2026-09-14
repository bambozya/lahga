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
.word-card { margin-bottom: var(--space-l); }
.head { display: flex; align-items: baseline; gap: var(--space-2xs); }
.definition { color: var(--muted); margin-top: var(--space-3xs); }
.forms { margin-top: var(--space-2xs); display: flex; flex-wrap: wrap; gap: var(--space-3xs) var(--space-s); }
.form-item { display: inline-flex; align-items: baseline; gap: var(--space-3xs); }
.form { font-weight: 700; font-size: var(--step-1); }
</style>
