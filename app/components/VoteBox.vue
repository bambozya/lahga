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
.vote { display: inline-flex; align-items: center; border: 2px solid var(--ink); }
.vote-btn {
  background: var(--paper); border: none; padding: 0.15rem 0.6rem; font-size: 0.85rem; line-height: 1.6;
  color: var(--ink);
}
.vote-btn.up:hover { background: var(--green); color: #fff; }
.vote-btn.down:hover { background: var(--red); color: #fff; }
.vote-btn:disabled { cursor: default; }
.vote-score { min-width: 2.2rem; text-align: center; font-weight: 700; border-inline: 2px solid var(--ink); padding: 0 0.3rem; line-height: 1.6; }
</style>
