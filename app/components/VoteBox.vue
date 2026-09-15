<script setup lang="ts">
// The vote control: a disabled <fieldset> until voting lands, so every button
// inside is disabled natively. The score is an <output>, the result of the votes.
defineProps<{ score: number }>()
</script>

<template>
  <fieldset disabled dir="ltr" title="التصويت قريباً">
    <legend>الأصوات</legend>
    <button type="button" aria-label="صوّت بالإيجاب">▲</button>
    <output>{{ score }}</output>
    <button type="button" aria-label="صوّت بالسلب">▼</button>
  </fieldset>
</template>

<style scoped>
fieldset { display: inline-flex; direction: rtl; align-items: center; gap: var(--space-2xs); padding: 0 var(--space-2xs); vertical-align: middle; margin-inline-end: var(--space-s); }
fieldset > * { margin: 0; }
output { min-width: 2.5ch; text-align: center; font-weight: 700; }
</style>
