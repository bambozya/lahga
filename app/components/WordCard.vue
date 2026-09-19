<script setup lang="ts">
// One index result: a <dt> (the MSA headword) and a <dd> (definition and the
// dialect forms that map to it). Must sit in a <dl>.
const props = defineProps<{
  word: {
    id: number
    headword: string
    definition: string
    entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[]
  }
}>()

// A word may be said in thirty dialects; a result card shows the best-supported
// few and counts the rest, so a page of results stays a page of results.
const SHOWN = 6
const shown = computed(() => props.word.entries.slice(0, SHOWN))
const rest = computed(() => Math.max(0, props.word.entries.length - SHOWN))
</script>

<template>
  <div>
    <dt><NuxtLink :to="`/w/${word.id}`">{{ word.headword }}</NuxtLink> <small>بالفصحى</small></dt>
    <dd>
      <p>{{ word.definition }}</p>
      <p v-if="shown.length">
        <template v-for="e in shown" :key="e.id">
          <NuxtLink :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink> <b>{{ e.form }}</b>
        </template>
        <small v-if="rest">‏+{{ rest }} أخرى</small>
      </p>
    </dd>
  </div>
</template>
