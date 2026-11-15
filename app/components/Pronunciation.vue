<script setup lang="ts">
/**
 * How a form is said, in CAPHI (shared/utils/caphi.ts): a monospace run,
 * left to right, labelled «النطق», with the way to the symbol table for a
 * reader who has not met the notation. Shown under the form on the word page
 * and the form page, when a speaker has written it.
 */
defineProps<{ value: string }>()
</script>

<template>
  <p class="pronunciation">
    <small>النطق</small>
    <code dir="ltr" translate="no">{{ value }}</code>
    <small><NuxtLink to="/pronunciation">ما هذه الرموز؟</NuxtLink></small>
  </p>
</template>

<style scoped>
/* A label, the run, a quiet door: one line, with the gaps that keep them apart. */
.pronunciation { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2xs); }
.pronunciation > code { font-size: var(--step-0); letter-spacing: 0.04em; }
.pronunciation > small:last-child a { text-decoration-color: var(--hair); }
</style>
