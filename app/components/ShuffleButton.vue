<script setup lang="ts">
// The throw of the dice under a list of words: it asks for another handful.
// Drawn as a real pair of dice, two pips and three, because the button says
// what it does before anyone reads it.
//
// It is a real form pointed at the page it sits on, so without JS a click
// reloads the page — and since the words are drawn at random on the server,
// a reload is itself a new draw. With JS the page refetches in place instead.
defineProps<{ label: string, busy?: boolean }>()
defineEmits<{ shuffle: [] }>()
const route = useRoute()
</script>

<template>
  <form class="shuffle" :action="route.path" method="get" @submit.prevent="$emit('shuffle')">
    <button type="submit" :disabled="busy">
      <svg viewBox="0 0 24 24" aria-hidden="true" stroke-width="1.7">
        <rect x="2.4" y="2.4" width="9.2" height="9.2" rx="2" />
        <rect x="12.4" y="12.4" width="9.2" height="9.2" rx="2" />
        <circle cx="5.2" cy="5.2" r="1.05" />
        <circle cx="8.8" cy="8.8" r="1.05" />
        <circle cx="15" cy="15" r="1.05" />
        <circle cx="17" cy="17" r="1.05" />
        <circle cx="19" cy="19" r="1.05" />
      </svg>
      {{ label }}
    </button>
  </form>
</template>

<style scoped>
/* A rule closes the list, and the dice sit centred under it: the end of the
   page, not another entry in it. */
.shuffle {
  display: flex; justify-content: center;
  border-block-start: var(--rule); padding-block-start: var(--space-m);
}
/* The site fills every svg with currentColor; these are drawn, not filled,
   so the dice are outlines and only the pips are solid. */
.shuffle svg { fill: none; stroke: currentColor; transition: rotate 0.25s ease; }
.shuffle svg circle { fill: currentColor; stroke: none; }
.shuffle button:hover:not(:disabled) svg { rotate: -20deg; }
@media (prefers-reduced-motion: reduce) { .shuffle svg { transition: none; } }
</style>
