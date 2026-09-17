<script setup lang="ts">
// The vote control: a disabled <fieldset> until voting lands, so every button
// inside is disabled natively. The score is an <output>, the result of the votes.
defineProps<{ score: number }>()
</script>

<template>
  <!-- Icons: Material Symbols (Apache 2.0): arrow_upward, arrow_downward. -->
  <fieldset disabled title="التصويت قريباً">
    <legend>الأصوات</legend>
    <button type="button" aria-label="صوّت بالإيجاب"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z" /></svg></button>
    <output>{{ score }}</output>
    <button type="button" aria-label="صوّت بالسلب"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z" /></svg></button>
  </fieldset>
</template>

<style scoped>
/* The legend is for screen readers; visually the arrows and the number are enough. */
fieldset { display: inline-flex; align-items: center; gap: var(--space-2xs); margin: 0; padding: 0; border: 0; }
fieldset > * { margin: 0; }
legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
button { min-height: 2.25rem; min-width: 2.25rem; border-radius: 99rem; }
output { min-width: 2ch; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
