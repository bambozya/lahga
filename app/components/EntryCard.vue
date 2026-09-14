<script setup lang="ts">
defineProps<{
  entry: {
    id: number
    form: string
    meaning: string
    notes?: string | null
    score: number
    createdAt?: string | Date
    dialect: { slug: string, nameAr: string }
    words: { id: number, headword: string }[]
    examples: { id: number, text: string, gloss?: string | null }[]
    synonyms: { id: number, form: string, wordId: number, dialect: { slug: string, nameAr: string } }[]
  }
  hideDialect?: boolean
}>()

const fmt = (d?: string | Date) => d ? new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(new Date(d)) : ''
</script>

<template>
  <article class="entry">
    <p v-if="entry.createdAt" class="date">{{ fmt(entry.createdAt) }}</p>
    <div class="entry-head">
      <span class="lemma">{{ entry.form }}</span>
      <NuxtLink v-if="!hideDialect" :to="`/d/${entry.dialect.slug}`" class="pill">{{ entry.dialect.nameAr }}</NuxtLink>
      <VoteBox :score="entry.score" class="entry-vote" />
    </div>

    <p class="meaning">
      <span class="form-inline">{{ entry.form }}</span> تعني:
      <NuxtLink v-for="w in entry.words" :key="w.id" :to="`/w/${w.id}`" class="msa">{{ w.headword }}</NuxtLink>
      <span v-if="!entry.words.length">{{ entry.meaning }}</span>
    </p>
    <p v-if="entry.words.length" class="meaning-text">{{ entry.meaning }}</p>
    <p v-if="entry.notes" class="muted">{{ entry.notes }}</p>

    <ul v-if="entry.examples.length" class="examples">
      <li v-for="x in entry.examples" :key="x.id">
        <span class="example">{{ x.text }}</span>
        <span v-if="x.gloss" class="gloss">{{ x.gloss }}</span>
      </li>
    </ul>

    <p v-if="entry.synonyms.length" class="synonyms">
      <span class="row-label">مرادفات</span>
      <NuxtLink v-for="s in entry.synonyms" :key="s.id" :to="`/w/${s.wordId}`" class="pill pill--green" :title="s.form">{{ s.dialect.nameAr }}</NuxtLink>
    </p>
  </article>
</template>

<style scoped>
.entry { margin-bottom: var(--space-l); }
.date { line-height: 1.2; }
.entry-head { display: flex; align-items: baseline; gap: var(--space-2xs); flex-wrap: wrap; }
.entry-vote { margin-inline-start: auto; align-self: center; }
.meaning { margin-top: var(--space-2xs); }
.form-inline { font-weight: 700; }
.msa { font-weight: 700; margin-inline-end: var(--space-3xs); }
.meaning-text { color: var(--muted); margin-top: 0; }
.examples { list-style: none; padding: 0; margin: var(--space-3xs) 0 0; }
.examples li { display: flex; flex-direction: column; }
.gloss { color: var(--muted); font-size: var(--step--1); }
.synonyms { margin-top: var(--space-2xs); display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3xs); }
</style>
