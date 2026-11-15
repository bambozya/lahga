<script setup lang="ts">
/**
 * A game result as a row of nuqtas (#49): green for the attempt or round that
 * was right, ink for one used or wrong, the open outline for one never
 * reached. Left to right, oldest first, as the share card draws it. The row
 * is one image to a screen reader, named by `label`.
 */
import type { Mark } from '~~/shared/utils/games'
defineProps<{ marks: Mark[], label: string }>()
</script>

<template>
  <p class="nuqtas" dir="ltr" role="img" :aria-label="label">
    <span v-for="(m, i) in marks" :key="i" :class="m" aria-hidden="true"></span>
  </p>
</template>

<style scoped>
.nuqtas { display: flex; gap: 0.3em; font-size: var(--step-2); }
.nuqtas > span { display: inline-block; width: 1em; height: 1em; background: var(--ink); mask: var(--nuqta) center / contain no-repeat; }
.nuqtas > .right { background: var(--right); }
.nuqtas > .open { background: var(--hair); mask: var(--nuqta-open) center / contain no-repeat; }
</style>
