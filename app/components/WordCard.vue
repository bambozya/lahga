<script setup lang="ts">
// One index result: a <dt> (the MSA headword) and a <dd> (definition and the
// dialect forms that map to it). Must sit in a <dl>.
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
  <div>
    <dt><NuxtLink :to="`/w/${word.id}`">{{ word.headword }}</NuxtLink> <small>بالفصحى</small></dt>
    <dd>
      <p>{{ word.definition }}</p>
      <p v-if="word.entries.length">
        <template v-for="e in word.entries" :key="e.id">
          <NuxtLink :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink> <b>{{ e.form }}</b>
        </template>
      </p>
    </dd>
  </div>
</template>
