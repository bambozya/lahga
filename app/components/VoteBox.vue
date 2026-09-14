<script setup lang="ts">
// Visual placeholder for the vote control. Wired to the API when voting lands.
defineProps<{ score: number }>()
</script>

<template>
  <div class="vote" dir="ltr" title="التصويت قريباً">
    <button type="button" class="vote-btn up" disabled aria-label="تصويت بالإيجاب">▲</button>
    <span class="vote-score">{{ score }}</span>
    <button type="button" class="vote-btn down" disabled aria-label="تصويت بالسلب">▼</button>
  </div>
</template>

<style scoped>
.vote { display: inline-flex; align-items: center; border: 1px solid var(--line); font-size: var(--step--1); }
.vote-btn { background: var(--paper); border: none; padding: 0 var(--space-2xs); font-size: 0.8em; line-height: 1.9; color: var(--muted); }
.vote-btn.up:hover { background: var(--green); color: #fff; }
.vote-btn.down:hover { background: var(--red); color: #fff; }
.vote-btn:disabled { cursor: default; }
.vote-score { min-width: 2.2em; text-align: center; font-weight: 700; border-inline: 1px solid var(--line); padding-inline: var(--space-3xs); line-height: 1.9; }
</style>
