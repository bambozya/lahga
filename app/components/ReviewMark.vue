<script setup lang="ts">
/**
 * The one quiet line under a draft form (schema.wordEntryLinks.needsReview):
 * everyone reads that no speaker has confirmed it yet; a verified reader is
 * asked whether their dialect says it so, and the answer is an ordinary vote on
 * the link — two net «yes» take the mark off (server/utils/votes.ts). Admins
 * and moderators may simply confirm it. Everything else about voting stays
 * hidden (see VoteBox.vue); this is the only place a reader is asked.
 */
const props = defineProps<{ linkId: number, myVote: number, dialect: { slug: string, nameAr: string } }>()
const emit = defineEmits<{ confirmed: [] }>()
const { loggedIn, user } = useUserSession()
const route = useRoute()
const mine = ref(props.myVote)
const busy = ref(false)
const error = ref('')
const moderator = computed(() => user.value?.role === 'admin' || user.value?.role === 'moderator')

const answer = async (value: 1 | -1) => {
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { next: route.fullPath } })
  if (busy.value) return
  const next = mine.value === value ? 0 : value
  busy.value = true; error.value = ''
  try {
    const res = await $fetch<{ score: number }>('/api/votes', { method: 'PUT', body: { targetType: 'link', targetId: props.linkId, value: next } })
    mine.value = next
    if (res.score >= 2) emit('confirmed')
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التصويت' }
  finally { busy.value = false }
}
const confirmIt = async () => {
  busy.value = true; error.value = ''
  try { await $fetch(`/api/links/${props.linkId}/confirm`, { method: 'POST' }); emit('confirmed') }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التأكيد' }
  finally { busy.value = false }
}
</script>

<template>
  <p class="review"><small>
    <NuxtLink :to="{ path: '/review', query: { dialect: dialect.slug } }">لم يتحقق منها متحدّث بعد</NuxtLink>
    <template v-if="loggedIn && user?.emailVerified">
      · هل تُقال هكذا في {{ dialect.nameAr }}؟
      <button type="button" :aria-pressed="mine === 1" :disabled="busy" @click="answer(1)">نعم</button>
      <button type="button" :aria-pressed="mine === -1" :disabled="busy" @click="answer(-1)">لا</button>
    </template>
    <template v-if="moderator"> · <button type="button" :disabled="busy" @click="confirmIt">تأكيد</button></template>
    <span v-if="error" role="alert"> · {{ error }}</span>
  </small></p>
</template>

<style scoped>
.review { color: var(--muted); }
.review a { text-decoration-color: var(--hair); }
/* Answers are words in the sentence, not buttons shouting over it. */
.review button {
  all: unset;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--hair);
  text-underline-offset: 0.25em;
  margin-inline: 0.15em;
}
.review button:hover,
.review button:focus-visible { color: var(--accent); text-decoration-color: currentColor; }
.review button[aria-pressed="true"] { color: var(--ink); font-weight: 700; text-decoration-color: var(--accent); }
.review button:disabled { cursor: progress; opacity: 0.6; }
</style>
