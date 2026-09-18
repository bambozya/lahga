<script setup lang="ts">
/**
 * The vote control. Logged-in, verified users vote up or down, once per item;
 * pressing the same arrow again removes the vote. Visitors are sent to the login
 * page. Authors cannot vote on their own items (the server refuses; the box is
 * shown disabled). The score is an <output>, the result of the votes.
 */
const props = defineProps<{
  targetType: 'word' | 'entry' | 'link' | 'example'
  targetId: number
  score: number
  myVote?: number
  createdBy?: number | null
}>()
const { loggedIn, user } = useUserSession()
const route = useRoute()
const score = ref(props.score)
const mine = ref(props.myVote ?? 0)
watch(() => props.score, v => { score.value = v })
watch(() => props.myVote, v => { mine.value = v ?? 0 })
const own = computed(() => loggedIn.value && props.createdBy != null && props.createdBy === user.value?.id)
const busy = ref(false)
const error = ref('')

const vote = async (value: 1 | -1) => {
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { next: route.fullPath } })
  if (busy.value) return
  const next = mine.value === value ? 0 : value
  // Optimistic: show the result at once, put it back if the server says no.
  const before = { score: score.value, mine: mine.value }
  score.value += next - mine.value
  mine.value = next
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/votes', { method: 'PUT', body: { targetType: props.targetType, targetId: props.targetId, value: next } })
    score.value = res.score
    mine.value = res.mine
  } catch (e: any) {
    score.value = before.score
    mine.value = before.mine
    error.value = e?.data?.statusMessage || 'تعذر التصويت'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- Icons: Material Symbols (Apache 2.0): arrow_upward, arrow_downward. -->
  <fieldset :disabled="own || busy" :title="own ? 'لا يمكنك التصويت على ما أضفته أنت' : loggedIn ? 'صوّت' : 'سجّل الدخول للتصويت'">
    <legend>الأصوات</legend>
    <button type="button" :aria-pressed="mine === 1" aria-label="صوّت بالإيجاب" @click="vote(1)"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z" /></svg></button>
    <output>{{ score }}</output>
    <button type="button" :aria-pressed="mine === -1" aria-label="صوّت بالسلب" @click="vote(-1)"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z" /></svg></button>
    <small v-if="error" role="alert">{{ error }}</small>
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
