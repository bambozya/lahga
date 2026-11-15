<script setup lang="ts">
/**
 * «هل تُقال هكذا؟»: the drafts no speaker has confirmed yet
 * (schema.wordEntryLinks.needsReview), one at a time, for anyone, no account.
 * Pick your dialect once, then it is one card and three answers: نعم، لا،
 * لا أعرف. The answers go where the quiet line under a draft on a word page
 * sends them (ReviewMark, PUT /api/links/[id]/answer); this page only saves
 * the reader the walk from word to word. /check?dialect=libyan is a link
 * worth sending to someone who speaks it.
 */
type Item = { linkId: number, form: string, formVocalized: string | null, headword: string, definition: string | null, meaning: string | null, wordSlug: string | null }
type Count = { slug: string, nameAr: string, n: number }
type Batch = { counts: Count[], dialect: Count | null, items: Item[] }
type Last = { item: Item, value: 1 | -1, confirmed: boolean }

const DIALECT_KEY = 'lahga-check-dialect'
const route = useRoute()
const router = useRouter()
const slug = computed(() => /^[a-z0-9-]{2,60}$/.test(String(route.query.dialect ?? '')) ? String(route.query.dialect) : '')

const { data, refresh } = await useFetch<Batch>('/api/check', { query: { dialect: slug } })
const counts = computed(() => data.value?.counts ?? [])
const dialect = computed(() => data.value?.dialect ?? null)

// The queue in hand, what the visitor passed on or answered (never asked
// again this visit), and the last answer, which can be taken back.
const queue = ref<Item[]>([])
const seen = ref<number[]>([])
const last = ref<Last | null>(null)
const answers = ref(0)
const confirmedByMe = ref(0)
const busy = ref(false)
const error = ref('')
const drained = ref(false)
const current = computed(() => queue.value[0] ?? null)
const shownForm = (it: Item) => it.formVocalized || it.form

watch(data, (d) => {
  queue.value = d?.items ?? []
  seen.value = []
  last.value = null
  drained.value = !!d?.dialect && !d.items.length
}, { immediate: true })

// The chosen dialect is remembered in the browser, like the theme: a return
// visit opens on it. Storage can throw (a private window); then it is not.
onMounted(() => {
  if (slug.value) {
    try { localStorage.setItem(DIALECT_KEY, slug.value) } catch { /* not remembered */ }
    return
  }
  try {
    const saved = localStorage.getItem(DIALECT_KEY)
    if (saved && counts.value.some(c => c.slug === saved)) router.replace({ query: { dialect: saved } })
  } catch { /* nothing remembered */ }
})
const choose = (s: string) => {
  try { localStorage.setItem(DIALECT_KEY, s) } catch { /* not remembered */ }
  return router.push({ query: { dialect: s } })
}

/** Asks for more once the hand runs low, skipping everything this visit has held. */
const topUp = async () => {
  if (!slug.value || busy.value || queue.value.length >= 3) return
  const skip = [...seen.value, ...queue.value.map(q => q.linkId)]
  try {
    const more = await $fetch<Batch>('/api/check', { query: { dialect: slug.value, skip: skip.join(',') } })
    const held = new Set(skip)
    queue.value.push(...more.items.filter(it => !held.has(it.linkId)))
    drained.value = !queue.value.length
  } catch { /* the next answer tries again */ }
}

const advance = () => {
  const it = queue.value.shift()
  if (it) seen.value.push(it.linkId)
  if (!queue.value.length) drained.value = true
  topUp()
}

const answer = async (value: 1 | -1) => {
  const it = current.value
  if (!it || busy.value) return
  busy.value = true; error.value = ''
  try {
    const res = await $fetch<{ mine: number, confirmed: boolean }>(`/api/links/${it.linkId}/answer`, { method: 'PUT', body: { value } })
    answers.value++
    if (res.confirmed) confirmedByMe.value++
    last.value = { item: it, value, confirmed: res.confirmed }
    advance()
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الحفظ، حاول مرة أخرى' }
  finally { busy.value = false }
}

/** «لا أعرف»: nothing is sent; the draft simply goes to somebody else. */
const pass = () => { if (!busy.value) { last.value = null; advance() } }

/** Takes the last answer back (value 0) and puts its card in front again. */
const undo = async () => {
  const l = last.value
  if (!l || busy.value) return
  busy.value = true; error.value = ''
  try {
    await $fetch(`/api/links/${l.item.linkId}/answer`, { method: 'PUT', body: { value: 0 } })
    answers.value--
    if (l.confirmed) confirmedByMe.value--
    seen.value = seen.value.filter(id => id !== l.item.linkId)
    queue.value.unshift(l.item)
    drained.value = false
    last.value = null
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التراجع' }
  finally { busy.value = false }
}

const total = computed(() => counts.value.reduce((n, c) => n + c.n, 0))
useSeo({
  title: () => dialect.value ? `هل تُقال هكذا في ${dialect.value.nameAr}؟` : 'هل تُقال هكذا؟',
  description: () => dialect.value
    ? `كلمات ${dialect.value.nameAr} التي لم يؤكدها متحدّث بعد، واحدة واحدة: هل تُقال هكذا؟ نعم، لا، لا أعرف. بلا حساب.`
    : 'ساعد معجم لهجة: كلمات من لهجتك لم يؤكدها متحدّث بعد، تُعرض واحدة واحدة، وتجيب: هل تُقال هكذا؟ بلا حساب.',
  path: '/check',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="dialect ? [{ label: 'هل تُقال هكذا؟', to: '/check' }, { label: dialect.nameAr }] : [{ label: 'هل تُقال هكذا؟' }]" />
    <hgroup class="head">
      <h1>هل تُقال هكذا؟</h1>
      <p>
        بعض كلمات المعجم صاغها نموذج لغوي ولم يؤكدها متحدّث بعد. إن كانت لهجتك،
        فجوابك هو ما يثبتها أو يسقطها. بلا حساب، وبلا نتيجة تُشارك: هذه مساعدة لا لغز.
      </p>
    </hgroup>

    <!-- No dialect yet: pick one. A dialect with nothing left to ask is not offered. -->
    <section v-if="!dialect">
      <h2>ما لهجتك؟</h2>
      <p v-if="!total">لا شيء ينتظر التحقق الآن. شكراً لكل من أجاب.</p>
      <ul v-else class="dialects">
        <li v-for="c in counts" :key="c.slug">
          <NuxtLink :to="{ query: { dialect: c.slug } }" @click.prevent="choose(c.slug)">{{ c.nameAr }}</NuxtLink>
          <small> {{ c.n }}</small>
        </li>
      </ul>
    </section>

    <template v-else>
      <p class="tools"><small>
        {{ dialect.nameAr }}
        <template v-if="dialect.n"> · {{ dialect.n }} كلمة تنتظر</template>
        · <NuxtLink :to="{ query: {} }">لهجة أخرى</NuxtLink>
      </small></p>

      <section v-if="current" class="card" aria-live="polite">
        <p class="fusha"><b>بالفصحى</b> {{ current.headword }}<template v-if="current.definition">: <span class="definition">{{ current.definition }}</span></template></p>
        <p class="form"><dfn>{{ shownForm(current) }}</dfn></p>
        <p v-if="current.meaning" class="meaning"><small>{{ current.meaning }}</small></p>
        <p class="question">هل تُقال هكذا في {{ dialect.nameAr }}؟</p>
        <p class="answers">
          <button type="button" :disabled="busy" @click="answer(1)">نعم</button>
          <button type="button" :disabled="busy" @click="answer(-1)">لا</button>
          <button type="button" class="secondary" :disabled="busy" @click="pass">لا أعرف</button>
        </p>
        <p role="alert" v-if="error"><small>{{ error }}</small></p>
      </section>

      <section v-else-if="drained" class="card">
        <p>لم يبقَ في {{ dialect.nameAr }} ما تُسأل عنه الآن<template v-if="answers">، وقد أجبت عن {{ answers }}</template>. شكراً لك.</p>
        <p><small><NuxtLink :to="{ query: {} }">جرّب لهجة أخرى</NuxtLink></small></p>
      </section>

      <!-- The last answer, in one line: what it was, what it did, and the way back. -->
      <p v-if="last" class="last" role="status"><small>
        <template v-if="last.value === 1">قلتَ «نعم» عن «{{ shownForm(last.item) }}»</template>
        <template v-else>قلتَ «لا» عن «{{ shownForm(last.item) }}»<template v-if="last.item.wordSlug">؛ إن عرفت الصواب <NuxtLink :to="`/w/${last.item.wordSlug}`">فصحّحه في صفحة الكلمة</NuxtLink></template></template>
        <template v-if="last.confirmed">. بجوابك اكتمل التحقق منها</template>
        · <button type="button" class="link" :disabled="busy" @click="undo">تراجع</button>
      </small></p>

      <p v-if="answers" class="tally"><small>
        أجبت عن {{ answers }}<template v-if="confirmedByMe">، واكتمل بجوابك التحقق من {{ confirmedByMe }}</template>.
      </small></p>
    </template>
  </article>
</template>

<style scoped>
.head > p { font-size: var(--step-0); color: var(--muted); }
.dialects { display: flex; flex-wrap: wrap; gap: var(--space-2xs) var(--space-s); padding: 0; list-style: none; }
.dialects small { color: var(--muted); }
.tools { margin-block-start: var(--space-s); color: var(--muted); }

/* One card, the form as the headline, the question under it, the answers as
   three plain buttons big enough for a thumb. */
.card { margin-block-start: var(--space-m); padding-block: var(--space-m); border-block: var(--rule); }
.fusha { color: var(--muted); }
.fusha > b { color: var(--ink); margin-inline-end: var(--space-2xs); }
.form { margin-block: var(--space-xs); }
.form > dfn { font: 700 var(--step-5)/1.2 var(--naskh); font-style: normal; }
.question { margin-block-start: var(--space-xs); }
.answers { display: flex; flex-wrap: wrap; gap: var(--space-2xs); margin-block-start: var(--space-xs); }
.answers > button { min-inline-size: 6em; padding-block: var(--space-2xs); }
.last, .tally { color: var(--muted); }
.last .link { all: unset; cursor: pointer; text-decoration: underline; text-decoration-color: var(--hair); text-underline-offset: 0.25em; }
.last .link:hover, .last .link:focus-visible { color: var(--accent); text-decoration-color: currentColor; }
</style>
