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
.vote { display: inline-flex; align-items: center; border: 1px solid var(--line); }
.vote-btn {
  background: var(--paper); border: none; padding: 0.1rem 0.55rem; font-size: 0.75rem; line-height: 1.6;
  color: var(--muted);
}
.vote-btn.up:hover { background: var(--green); color: #fff; }
.vote-btn.down:hover { background: var(--red); color: #fff; }
.vote-btn:disabled { cursor: default; }
.vote-score { min-width: 2rem; text-align: center; font-weight: 700; font-size: 0.9rem; border-inline: 1px solid var(--line); padding: 0 0.3rem; line-height: 1.6; }
</style>
