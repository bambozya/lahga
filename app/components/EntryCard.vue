<script setup lang="ts">
// One entry of the dictionary list: a <dt> (the form, tagged with its dialect)
// and a <dd> (what it means, examples, synonyms, date, votes). Must sit in a <dl>.
// A synonym reads like the headword row above it: the form first, then its dialect.
defineProps<{
  entry: {
    id: number
    form: string
    meaning: string
    notes?: string | null
    score: number
    myVote?: number
    createdBy?: number | null
    createdAt?: string | Date
    dialect: { slug: string, nameAr: string }
    words: { id: number, headword: string }[]
    examples: { id: number, text: string, gloss?: string | null }[]
    synonyms: { id: number, form: string, wordId: number, dialect: { slug: string, nameAr: string } }[]
  }
  hideDialect?: boolean
}>()

const iso = (d: string | Date) => new Date(d).toISOString().slice(0, 10)
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
</script>

<template>
  <div>
    <dt>
      <b>{{ entry.form }}</b>
      <NuxtLink v-if="!hideDialect" :to="`/d/${entry.dialect.slug}`" rel="tag">{{ entry.dialect.nameAr }}</NuxtLink>
    </dt>
    <dd>
      <p v-if="entry.words.length">
        بالفصحى:
        <template v-for="(w, i) in entry.words" :key="w.id">
          <template v-if="i">، </template><NuxtLink :to="`/w/${w.id}`">{{ w.headword }}</NuxtLink>
        </template>
      </p>
      <p>{{ entry.meaning }}</p>
      <p v-if="entry.notes"><small>{{ entry.notes }}</small></p>

      <ul v-if="entry.examples.length">
        <li v-for="x in entry.examples" :key="x.id">
          <q>{{ x.text }}</q>
          <small v-if="x.gloss"> {{ x.gloss }}</small>
        </li>
      </ul>

      <p v-if="entry.synonyms.length">
        مرادفات:
        <template v-for="s in entry.synonyms" :key="s.id"><NuxtLink :to="`/w/${s.wordId}`">{{ s.form }}</NuxtLink><NuxtLink :to="`/d/${s.dialect.slug}`" rel="tag">{{ s.dialect.nameAr }}</NuxtLink></template>
      </p>

      <div>
        <VoteBox target-type="entry" :target-id="entry.id" :score="entry.score" :my-vote="entry.myVote" :created-by="entry.createdBy" />
        <time v-if="entry.createdAt" :datetime="iso(entry.createdAt)">{{ fmt(entry.createdAt) }}</time>
      </div>
    </dd>
  </div>
</template>
