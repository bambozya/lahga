<script setup lang="ts">
// The end of a day's round, the same panel for every game (docs/ROADMAP.md B3):
// the game's own summary in the default slot, then the streak, the result card
// and the share buttons, then the game's own links in the `links` slot.
// Styled in main.css (.game-result).
defineProps<{
  cardUrl: string
  cardAlt: string
  fileName: string
  shareText: string
  /** Days in a row with a finished round (useGameProgress().streak). */
  streak: number
}>()

/** «يوم واحد، يومان، ٣ أيام، ١١ يوماً»: the noun agrees with the number. */
const days = (n: number) => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? `${arabicDigits(n)} أيام` : `${arabicDigits(n)} يوماً`
</script>

<template>
  <section class="game-result" role="status">
    <slot />
    <p v-if="streak > 1" class="streak">لعبت {{ days(streak) }} على التوالي.</p>
    <p v-if="cardUrl" class="card">
      <img :src="cardUrl" :alt="cardAlt" width="270" height="338" loading="lazy" />
    </p>
    <p class="actions">
      <GameShare :card-url="cardUrl" :file-name="fileName" :text="shareText" />
      <slot name="links" />
    </p>
  </section>
</template>
