<script setup lang="ts">
import { CHECK_ROUND } from '~~/shared/config/rules'
import { arabicCount, checkMarks, checkShareText, wordsCount, type DialectProgress, type Outcome } from '~~/shared/utils/check'
import { todayDate } from '~~/shared/utils/daily'
/**
 * «هل تُقال هكذا؟»: the drafts no speaker has confirmed yet
 * (schema.wordEntryLinks.needsReview), one at a time, for anyone, no account.
 * Pick your dialect once, then it is one card and three answers: نعم، لا،
 * لا أعرف. The answers go where the quiet line under a draft on a word page
 * sends them (ReviewMark, PUT /api/links/[id]/answer); this page only saves
 * the reader the walk from word to word. /check?dialect=libyan is a link
 * worth sending to someone who speaks it.
 *
 * Since #51 the cards come in rounds of CHECK_ROUND, with a row of nuqtas, a
 * result panel, a daily streak and a line to share, and every dialect shows
 * how much of it speakers stand behind. The rule that must hold: a card
 * counts once it is seen. «لا» and «لا أعرف» move the round on exactly as
 * «نعم» does, and nothing is earned by answering fast.
 */
type Item = { linkId: number, form: string, formVocalized: string | null, headword: string, definition: string | null, meaning: string | null, wordSlug: string | null }
type Batch = { counts: DialectProgress[], dialect: DialectProgress | null, items: Item[] }
type Last = { item: Item, value: 1 | -1, confirmed: boolean }
/** A finished round, kept once per day for the streak. */
type RoundResult = { seen: number, answered: number, confirmed: number }
/** What a refresh puts back: the round so far, the cards already held, and the day's totals in this dialect. */
type Saved = { dialect: string, outcomes: Outcome[], seen: number[], day: { answered: number, confirmed: number } }

const DIALECT_KEY = 'lahga-check-dialect'
const route = useRoute()
const router = useRouter()
const slug = computed(() => /^[a-z0-9-]{2,60}$/.test(String(route.query.dialect ?? '')) ? String(route.query.dialect) : '')

const { data } = await useFetch<Batch>('/api/check', { query: { dialect: slug } })
const counts = computed(() => data.value?.counts ?? [])
const dialect = computed(() => data.value?.dialect ?? null)

const progress = useGameProgress<RoundResult, Saved>('lahga-check')
const today = todayDate()

// The queue in hand, what the visitor passed on or answered (never asked
// again this visit), and the last answer, which can be taken back.
const queue = ref<Item[]>([])
const seen = ref<number[]>([])
const last = ref<Last | null>(null)
// The round: one outcome per card dealt with. And the day in this dialect, for the line to share.
const outcomes = ref<Outcome[]>([])
const day = ref({ answered: 0, confirmed: 0 })
// Drafts settled since the page loaded its counts: the bar moves without asking the server again.
const settled = ref(0)
const busy = ref(false)
const error = ref('')
const drained = ref(false)
// The request for more cards in flight, if any, and whether the last one failed with nothing in hand.
let filling: Promise<void> | null = null
const loadFailed = ref(false)
const current = computed(() => queue.value[0] ?? null)
const shownForm = (it: Item) => it.formVocalized || it.form

const marks = computed(() => checkMarks(outcomes.value, CHECK_ROUND))
const roundAnswered = computed(() => outcomes.value.filter(o => o.answered).length)
const roundConfirmed = computed(() => outcomes.value.filter(o => o.confirmed).length)
/** Ten cards seen, or fewer when the dialect ran out first. */
const roundOver = computed(() => outcomes.value.length >= CHECK_ROUND || (drained.value && outcomes.value.length > 0))

const remember = () => {
  if (slug.value) progress.saveRound(today, { dialect: slug.value, outcomes: outcomes.value, seen: seen.value, day: day.value })
}

/** After a refresh: the same round, and none of the cards it already held. */
const restore = () => {
  const saved = progress.roundFor(today)
  if (!saved || saved.dialect !== slug.value) return
  outcomes.value = saved.outcomes
  day.value = saved.day
  seen.value = saved.seen
  const held = new Set(saved.seen)
  queue.value = queue.value.filter(q => !held.has(q.linkId))
  topUp()
}

watch(data, (d) => {
  queue.value = d?.items ?? []
  seen.value = []
  last.value = null
  outcomes.value = []
  day.value = { answered: 0, confirmed: 0 }
  settled.value = 0
  loadFailed.value = false
  drained.value = !!d?.dialect && !d.items.length
  if (progress.loaded.value) restore()
}, { immediate: true })

// The chosen dialect is remembered in the browser, like the theme: a return
// visit opens on it. Storage can throw (a private window); then it is not.
onMounted(() => {
  if (slug.value) {
    try { localStorage.setItem(DIALECT_KEY, slug.value) } catch { /* not remembered */ }
    restore()
    return
  }
  try {
    const saved = localStorage.getItem(DIALECT_KEY)
    if (saved && counts.value.some(c => c.slug === saved && c.n)) router.replace({ query: { dialect: saved } })
  } catch { /* nothing remembered */ }
})
const choose = (s: string) => {
  try { localStorage.setItem(DIALECT_KEY, s) } catch { /* not remembered */ }
  return router.push({ query: { dialect: s } })
}

/**
 * Asks for more once the hand runs low, skipping everything this visit has
 * held. One request at a time: a second caller waits on the first. Only the
 * server's answer says the dialect has run dry; a failed request does not.
 */
function topUp() {
  if (!slug.value || queue.value.length >= 3) return Promise.resolve()
  return filling ??= (async () => {
    const held = [...seen.value, ...queue.value.map(q => q.linkId)]
    try {
      const more = await $fetch<Batch>('/api/check', { query: { dialect: slug.value, skip: held.slice(-200).join(',') } })
      const now = new Set([...seen.value, ...queue.value.map(q => q.linkId)])
      queue.value.push(...more.items.filter(it => !now.has(it.linkId)))
      drained.value = !queue.value.length
      loadFailed.value = false
    } catch { loadFailed.value = !queue.value.length /* with cards in hand, the next answer tries again */ }
    finally { filling = null }
  })()
}

// For screen readers: the result takes focus when a round ends, the card when a new one starts.
const resultPanel = ref<{ $el: HTMLElement } | null>(null)
const card = ref<HTMLElement | null>(null)

/** The card is dealt with: it leaves the queue, the round moves on by one, and a tenth card ends it. */
const advance = async (outcome: Outcome) => {
  const it = queue.value.shift()
  if (it) seen.value.push(it.linkId)
  outcomes.value = [...outcomes.value, outcome]
  // An empty hand mid-round: ask before calling the dialect finished.
  if (!queue.value.length && outcomes.value.length < CHECK_ROUND) await topUp()
  if (roundOver.value) {
    progress.recordResult(today, { seen: outcomes.value.length, answered: roundAnswered.value, confirmed: roundConfirmed.value })
    remember()
    await nextTick()
    resultPanel.value?.$el?.focus()
  } else {
    remember()
  }
  topUp()
}

const answer = async (value: 1 | -1) => {
  const it = current.value
  if (!it || busy.value || roundOver.value) return
  busy.value = true; error.value = ''
  try {
    const res = await $fetch<{ mine: number, confirmed: boolean }>(`/api/links/${it.linkId}/answer`, { method: 'PUT', body: { value } })
    day.value = { answered: day.value.answered + 1, confirmed: day.value.confirmed + (res.confirmed ? 1 : 0) }
    if (res.confirmed) settled.value++
    last.value = { item: it, value, confirmed: res.confirmed }
    busy.value = false
    await advance({ answered: true, confirmed: res.confirmed })
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الحفظ، حاول مرة أخرى' }
  finally { busy.value = false }
}

/** «لا أعرف»: nothing is sent; the draft simply goes to somebody else. The round moves on all the same. */
const pass = () => { if (!busy.value && !roundOver.value) { last.value = null; advance({ answered: false, confirmed: false }) } }

/**
 * Takes the last answer back (value 0), puts its card in front again and
 * steps the round back by one. Not offered once the answer has settled the
 * draft: a settled draft is never reopened (server/utils/votes.ts).
 */
const undo = async () => {
  const l = last.value
  if (!l || l.confirmed || busy.value) return
  busy.value = true; error.value = ''
  try {
    await $fetch(`/api/links/${l.item.linkId}/answer`, { method: 'PUT', body: { value: 0 } })
    day.value = { ...day.value, answered: Math.max(0, day.value.answered - 1) }
    outcomes.value = outcomes.value.slice(0, -1)
    seen.value = seen.value.filter(id => id !== l.item.linkId)
    queue.value.unshift(l.item)
    drained.value = false
    last.value = null
    remember()
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التراجع' }
  finally { busy.value = false }
}

/** «جولة أخرى»: a clean row, the same queue. */
const again = async () => {
  outcomes.value = []
  last.value = null
  remember()
  await topUp()
  await nextTick()
  card.value?.focus()
}

const shareText = computed(() => dialect.value ? checkShareText(day.value, dialect.value) : '')
const roundLabel = computed(() => `الكلمة ${arabicDigits(Math.min(outcomes.value.length + 1, CHECK_ROUND))} من ${arabicDigits(CHECK_ROUND)}`)
/** A dialect's bar: forms a speaker stands behind, of all its forms. */
const checkedNow = computed(() => dialect.value ? Math.min(dialect.value.total, dialect.value.checked + settled.value) : 0)
const barLabel = (checked: number, total: number) => `${arabicCount(checked)} من ${arabicCount(total)}`

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
        فجوابك هو ما يثبتها أو يسقطها. عشر كلمات في الجولة، بلا حساب، و«لا أعرف» جواب كغيره.
      </p>
    </hgroup>

    <!-- No dialect yet: pick one. Main dialects, the ones under them indented, and how far each has come. -->
    <section v-if="!dialect">
      <h2>ما لهجتك؟</h2>
      <p v-if="!total">لا شيء ينتظر التحقق الآن. شكراً لكل من أجاب.</p>
      <p v-else class="legend"><small>الشريط: ما أكّده متحدّثون من كلمات كل لهجة.</small></p>
      <ol class="dialects">
        <li v-for="c in counts" :key="c.slug" :style="{ '--depth': c.depth }" :class="{ heading: !c.total }">
          <span class="name">
            <NuxtLink v-if="c.n" :to="{ query: { dialect: c.slug } }" @click.prevent="choose(c.slug)">{{ c.nameAr }}</NuxtLink>
            <template v-else>{{ c.nameAr }}</template>
          </span>
          <template v-if="c.total">
            <progress :value="c.checked" :max="c.total" :aria-label="`${c.nameAr}: أُكّد ${barLabel(c.checked, c.total)}`"></progress>
            <small class="count">{{ barLabel(c.checked, c.total) }}</small>
          </template>
        </li>
      </ol>
    </section>

    <template v-else>
      <p class="tools"><small>
        {{ dialect.nameAr }}
        · <NuxtLink :to="{ query: {} }">لهجة أخرى</NuxtLink>
      </small></p>
      <p v-if="dialect.total" class="bar">
        <progress :value="checkedNow" :max="dialect.total" :aria-label="`${dialect.nameAr}: أُكّد ${barLabel(checkedNow, dialect.total)}`"></progress>
        <small class="count">أُكّد {{ barLabel(checkedNow, dialect.total) }}</small>
      </p>

      <!-- The round is over: what it came to, the streak, the line to share, and another round. -->
      <GameResult
        v-if="roundOver" ref="resultPanel"
        card-url="" card-alt="" file-name="" :share-text="shareText" :streak="progress.streak(today)"
      >
        <NuqtaRow :marks="marks" :label="`جولة من ${wordsCount(outcomes.length)}، ثبتت منها بجوابك ${arabicDigits(roundConfirmed)}`" />
        <p>
          أجبت عن {{ arabicDigits(roundAnswered) }} من {{ arabicDigits(outcomes.length) }}<template v-if="roundConfirmed">، وثبتت بجوابك {{ wordsCount(roundConfirmed) }}</template>.
          <template v-if="drained"> لم يبقَ في {{ dialect.nameAr }} ما تُسأل عنه الآن. شكراً لك.</template>
        </p>
        <template #links>
          <button v-if="!drained" type="button" class="secondary" @click="again">جولة أخرى</button>
          <NuxtLink v-else :to="{ query: {} }" class="cta">جرّب لهجة أخرى</NuxtLink>
        </template>
      </GameResult>

      <section v-else-if="current" ref="card" class="card" tabindex="-1" aria-live="polite">
        <NuqtaRow :marks="marks" :label="roundLabel" />
        <p class="fusha"><b>بالفصحى</b> {{ current.headword }}<template v-if="current.definition">: <span class="definition">{{ current.definition }}</span></template></p>
        <p class="form"><dfn>{{ shownForm(current) }}</dfn></p>
        <p v-if="current.meaning" class="meaning"><small>{{ current.meaning }}</small></p>
        <p class="question">هل تُقال هكذا في {{ dialect.nameAr }}؟</p>
        <p class="answers">
          <button type="button" :disabled="busy" @click="answer(1)">نعم</button>
          <button type="button" :disabled="busy" @click="answer(-1)">لا</button>
          <button type="button" class="secondary" :disabled="busy" @click="pass">لا أعرف</button>
        </p>
      </section>

      <section v-else-if="drained" class="card">
        <p>لم يبقَ في {{ dialect.nameAr }} ما تُسأل عنه الآن. شكراً لك.</p>
        <p><small><NuxtLink :to="{ query: {} }">جرّب لهجة أخرى</NuxtLink></small></p>
      </section>

      <section v-else-if="loadFailed" class="card">
        <p>تعذر تحميل الكلمات. <button type="button" class="secondary" @click="topUp()">حاول مرة أخرى</button></p>
      </section>

      <p role="alert" v-if="error"><small>{{ error }}</small></p>

      <!-- The last answer. One that settled a draft is the moment the page is for, and says so at full size. -->
      <p v-if="last?.confirmed" class="settled" role="status">ثبتت «{{ shownForm(last.item) }}» بجوابك.</p>
      <p v-else-if="last" class="last" role="status"><small>
        <template v-if="last.value === 1">قلتَ «نعم» عن «{{ shownForm(last.item) }}»</template>
        <template v-else>قلتَ «لا» عن «{{ shownForm(last.item) }}»<template v-if="last.item.wordSlug">؛ إن عرفت الصواب <NuxtLink :to="`/w/${last.item.wordSlug}`">فصحّحه في صفحة الكلمة</NuxtLink></template></template>
        · <button type="button" class="link" :disabled="busy" @click="undo">تراجع</button>
      </small></p>
    </template>
  </article>
</template>

<style scoped>
.head > p { font-size: var(--step-0); color: var(--muted); }
.legend, .tools { color: var(--muted); }
.tools { margin-block-start: var(--space-s); }

/* The dialects under each other: name, bar, count on one line; the ones
   under a main dialect indented by their depth. On a narrow screen the bar
   drops to its own line under the name and the count. */
.dialects { display: grid; gap: var(--space-2xs); padding: 0; margin-block-start: var(--space-xs); list-style: none; }
.dialects > li {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 0 var(--space-s);
}
/* Only the name steps in, so the bars stay one column and can be compared. */
.dialects .name { padding-inline-start: calc(var(--depth, 0) * var(--space-m)); }
.dialects > li > progress { grid-column: 1 / -1; grid-row: 2; }
.dialects > li.heading { margin-block-start: var(--space-2xs); font-weight: 700; }
.count { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (min-width: 36em) {
  .dialects > li { grid-template-columns: minmax(0, 14em) minmax(4em, 1fr) 9em; align-items: center; }
  .dialects > li > progress { grid-column: auto; grid-row: auto; }
}

/* The bar: a hairline track, ink for what speakers stand behind. */
progress {
  appearance: none; display: block; inline-size: 100%; block-size: 0.4em;
  border: 0; border-radius: 1em; background: var(--hair); color: var(--ink); overflow: hidden;
}
progress::-webkit-progress-bar { background: var(--hair); }
progress::-webkit-progress-value { background: var(--ink); transition: inline-size 0.4s; }
progress::-moz-progress-bar { background: var(--ink); }
.bar { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-s); }
@media (prefers-reduced-motion: reduce) { progress::-webkit-progress-value { transition: none; } }

/* One card, the round's nuqtas over it, the form as the headline, the
   question under it, the answers as three plain buttons big enough for a thumb. */
.card { margin-block-start: var(--space-m); padding-block: var(--space-m); border-block: var(--rule); }
.card:focus { outline: none; }
/* NuqtaRow runs left to right, as a share card does. Here it is progress on an Arabic page: it runs with the bar. */
article :deep(.nuqtas) { direction: rtl; }
.card :deep(.nuqtas) { font-size: var(--step-0); margin-block-end: var(--space-s); }
.fusha { color: var(--muted); }
.fusha > b { color: var(--ink); margin-inline-end: var(--space-2xs); }
.form { margin-block: var(--space-xs); }
.form > dfn { font: 700 var(--step-5)/1.2 var(--naskh); font-style: normal; }
.question { margin-block-start: var(--space-xs); }
.answers { display: flex; flex-wrap: wrap; gap: var(--space-2xs); margin-block-start: var(--space-xs); }
.answers > button { min-inline-size: 6em; padding-block: var(--space-2xs); }
.last { color: var(--muted); }
.last .link { all: unset; cursor: pointer; text-decoration: underline; text-decoration-color: var(--hair); text-underline-offset: 0.25em; }
.last .link:hover, .last .link:focus-visible { color: var(--accent); text-decoration-color: currentColor; }

article :deep(.game-result .actions) { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2xs) var(--space-s); }
article :deep(.game-result .actions .cta) { margin-inline-start: 0; }

/* A draft settled by this answer: the green nuqta of a right answer, and the sentence at full size. */
.settled { margin-block-start: var(--space-s); font-weight: 700; }
.settled::before {
  content: ""; display: inline-block; width: 0.7em; aspect-ratio: 1; margin-inline-end: 0.4em;
  background: var(--right); mask: var(--nuqta) center / contain no-repeat;
}
</style>
