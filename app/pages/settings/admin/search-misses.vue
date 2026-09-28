<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: عمليات بحث بلا نتيجة', noindex: true })
type SortKey = 'date' | 'count'
const sort = ref<SortKey>('date')
const dir = ref<'desc' | 'asc'>('desc')
const hideBots = ref(false)
const { data: misses, refresh } = await useFetch('/api/admin/search-misses', {
  query: computed(() => ({ sort: sort.value, dir: dir.value, bots: hideBots.value ? '0' : undefined })),
})
// A click on the sorted column turns it round; a click on the other one sorts by it, largest or newest first.
const sortBy = (key: SortKey) => {
  if (sort.value === key) dir.value = dir.value === 'desc' ? 'asc' : 'desc'
  else { sort.value = key; dir.value = 'desc' }
}
const ariaSort = (key: SortKey) => sort.value !== key ? 'none' : dir.value === 'desc' ? 'descending' : 'ascending'
const arrow = (key: SortKey) => sort.value !== key ? '' : dir.value === 'desc' ? '▼' : '▲'
// The server renders in its own zone (UTC in the container) and the browser in
// the admin's. Rendering UTC, labelled, until the page is mounted keeps the
// hydrated HTML identical to the server's; after that it switches to local time.
const local = ref(false)
onMounted(() => { local.value = true })
const fmt = (d: string | Date) => {
  const text = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: local.value ? undefined : 'UTC' }).format(new Date(d))
  return local.value ? text : `${text} UTC`
}
// Country codes to their Arabic names; the same ICU data on the server and in
// the browser, so the hydrated text matches.
const regionNames = new Intl.DisplayNames(['ar'], { type: 'region' })
const countryName = (code: string) => { try { return regionNames.of(code) ?? code } catch { return code } }

// The logged searches behind one term, fetched when its row is opened.
type MissEvent = {
  id: number, at: string, country: string | null, asn: number | null, network: string | null,
  visitor: string | null, device: string | null, os: string | null, browser: string | null,
  lang: string | null, timezone: string | null, referrer: string | null, via: string,
  signedIn: boolean, bot: string | null,
}
const open = ref<number | null>(null)
const events = ref<MissEvent[]>([])
const loadingEvents = ref(false)
const toggle = async (id: number) => {
  if (open.value === id) { open.value = null; return }
  open.value = id; events.value = []; loadingEvents.value = true; error.value = ''
  try { events.value = await $fetch<MissEvent[]>(`/api/admin/search-misses/${id}`) }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر جلب التفاصيل' }
  finally { loadingEvents.value = false }
}
const VIA: Record<string, string> = { app: 'كتبها في الموقع', page: 'فتح رابط بحث', api: 'طلب مباشر للواجهة' }
const BOT: Record<string, string> = {
  'declared': 'يعرّف نفسه روبوتاً',
  'no-ua': 'بلا اسم متصفح',
  'no-browser': 'تنقصه ترويسات يرسلها كل متصفح',
  'datacenter': 'من شبكة خوادم',
  'burst': 'بحث متلاحق كثير',
}
const DEVICE: Record<string, string> = { mobile: 'جوال', tablet: 'لوحي', desktop: 'حاسوب' }
const describe = (ev: MissEvent) => [
  ev.country ? countryName(ev.country) : null,
  ev.network,
  [ev.device ? DEVICE[ev.device] ?? ev.device : null, ev.os, ev.browser].filter(Boolean).join('، ') || null,
  ev.lang,
  ev.timezone,
  ev.referrer ? `جاء من ${ev.referrer}` : null,
  VIA[ev.via] ?? ev.via,
  ev.signedIn ? 'مسجّل الدخول' : null,
].filter(Boolean).join(' · ')

const busy = ref<number | null>(null)
const error = ref('')
const remove = async (id: number, term: string) => {
  if (!confirm(`حذف «${term.slice(0, 40)}» من القائمة؟`)) return
  busy.value = id; error.value = ''
  try { await $fetch(`/api/admin/search-misses/${id}`, { method: 'DELETE' }); await Promise.all([refresh(), refreshNuxtData('admin-stats')]) }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الحذف' }
  finally { busy.value = null }
}

// Clears every term a search would now find, the word having been added since.
const clearing = ref(false)
const cleared = ref('')
const clearFound = async () => {
  if (!confirm('حذف كل كلمة صار البحث عنها يجد نتيجة؟ يشمل ذلك ما لا يظهر في الصفحة.')) return
  clearing.value = true; error.value = ''; cleared.value = ''
  try {
    const { deleted } = await $fetch<{ deleted: number }>('/api/admin/search-misses/found', { method: 'DELETE' })
    cleared.value = deleted ? `حُذف ${deleted.toLocaleString('ar')} من القائمة.` : 'لا شيء مما في القائمة أُضيف بعد.'
    await Promise.all([refresh(), refreshNuxtData('admin-stats')])
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الحذف' }
  finally { clearing.value = false }
}
</script>

<template>
  <article>
    <BreadCrumbs
      :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'بحث بلا نتيجة' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>عمليات بحث بلا نتيجة</h2>
    <p><small>ما كتبه الزوار ولم يجدوا له شيئاً، الأحدث أولاً. هذه قائمة بما يُضاف بعده من كلمات. اضغط على عنوان العمود
        لترتيبه. «أشخاص» و«آلي» والبلدان عن آخر ٩٠ يوماً؛ «زوار» عدد الأشخاص المختلفين، ولا يُعرف الزائر نفسه إلا في
        يومه.</small></p>
    <div class="tools">
      <label class="hide-bots"><input v-model="hideBots" type="checkbox"> إخفاء ما لم يبحث عنه إلا الآلي</label>
      <button type="button" :disabled="clearing" @click="clearFound">حذف ما أُضيف بعد</button>
    </div>
    <p role="status" v-if="cleared">{{ cleared }}</p>
    <p role="alert" v-if="error">{{ error }}</p>
    <p v-if="!misses?.length">لا شيء بعد.</p>
    <table v-else class="misses">
      <thead>
        <tr>
          <th class="term-head">الكلمة المكتوبة</th>
          <th :aria-sort="ariaSort('count')"><button type="button" class="sort" @click="sortBy('count')">عدد المرات
              <span aria-hidden="true">{{ arrow('count') }}</span></button></th>
          <th class="who-head">أشخاص · آلي</th>
          <th :aria-sort="ariaSort('date')"><button type="button" class="sort" @click="sortBy('date')">آخر مرة <span
                aria-hidden="true">{{ arrow('date') }}</span></button></th>
          <th class="actions-head"></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="m in misses" :key="m.id">
          <tr>
            <td class="term">
              {{ m.term }}
              <small v-if="m.countries.length" class="countries">{{m.countries.map(c => `${countryName(c.code)}
                ${c.n}`).join('، ') }}</small>
            </td>
            <td class="count" data-label="عدد المرات">{{ m.count }}</td>
            <td class="who" data-label="أشخاص · آلي">
              <template v-if="m.people || m.bots">
                {{ m.people }} · {{ m.bots }}
                <small v-if="m.visitors" class="visitors">{{ m.visitors }} زوار</small>
              </template>
              <small v-else>—</small>
            </td>
            <td class="date" data-label="آخر مرة"><small><time :datetime="String(m.lastSearchedAt)">{{
              fmt(m.lastSearchedAt)
                  }}</time></small></td>
            <td class="actions">
              <NuxtLink :to="`/add-word?headword=${encodeURIComponent(m.term)}`">إضافة</NuxtLink>
              <button type="button" :aria-expanded="open === m.id" @click="toggle(m.id)">تفاصيل</button>
              <button type="button" :disabled="busy === m.id" @click="remove(m.id, m.term)">حذف</button>
            </td>
          </tr>
          <tr v-if="open === m.id" class="details">
            <td colspan="5">
              <p v-if="loadingEvents"><small>…</small></p>
              <p v-else-if="!events.length"><small>لا تفاصيل: سُجّلت هذه الكلمة قبل أن نحفظ التفاصيل، أو مضى عليها أكثر
                  من ٩٠
                  يوماً.</small></p>
              <ol v-else class="events">
                <li v-for="ev in events" :key="ev.id" :class="{ bot: ev.bot }">
                  <small>
                    <time :datetime="ev.at">{{ fmt(ev.at) }}</time> ·
                    {{ describe(ev) }}
                    <span v-if="ev.visitor" class="visitor" dir="ltr">#{{ ev.visitor.slice(0, 6) }}</span>
                    <strong v-if="ev.bot"> · آلي: {{ BOT[ev.bot] ?? ev.bot }}</strong>
                  </small>
                </li>
              </ol>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
/* A long or unbroken string must wrap inside its cell, never widen the page. */
.misses {
  table-layout: fixed;
}

.misses .term {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.misses th:nth-child(2) {
  width: 6em;
}

.misses th:nth-child(3) {
  width: 7em;
}

.misses th:nth-child(4) {
  width: 8em;
}

.misses th:last-child {
  width: 12em;
}

.countries,
.visitors {
  display: block;
  color: var(--muted);
}

.tools {
  display: flex;
  gap: var(--space-s);
  align-items: center;
  flex-wrap: wrap;
}

.hide-bots {
  display: inline-flex;
  gap: var(--space-2xs);
  align-items: center;
}

.events {
  margin: 0;
  padding-inline-start: 0;
  list-style: none;
}

.events li {
  padding-block: var(--space-3xs);
  overflow-wrap: anywhere;
}

.events li.bot {
  color: var(--muted);
}

.visitor {
  font-family: monospace;
}

/* The sort control is the heading itself, not a button beside it: same face as
   the other headings, the arrow the only sign it does something. */
.sort {
  min-height: 0;
  min-width: 0;
  padding: 0;
  font: inherit;
  background: transparent;
  color: inherit;
  border: 0;
  border-radius: 0;
  text-align: inherit;
}

.sort:hover {
  background: transparent;
  color: var(--accent);
}

.actions {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  flex-wrap: wrap;
}

input[type="checkbox"] {
  flex: 0;
}

/* Phones: four columns leave the term no room, so each row becomes a small
   card. The term takes the full width, count and date share one line under
   it with their own labels, and the actions sit at the end. The heading row
   stays as the two sort controls side by side. */
@media (max-width: 36rem) {

  .misses,
  .misses thead,
  .misses tbody {
    display: block;
  }

  .misses thead tr {
    display: flex;
    gap: var(--space-m);
    border-block-end: var(--rule);
  }

  .misses thead th {
    width: auto;
    border: 0;
    padding-inline: 0;
  }

  .misses .term-head,
  .misses .who-head,
  .misses .actions-head {
    display: none;
  }

  .misses tbody tr {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--space-m);
    padding-block: var(--space-xs);
    border-block-end: var(--thin);
  }

  .misses tbody td {
    border: 0;
    padding: 0;
  }

  .misses .term {
    grid-column: 1 / -1;
    font-weight: 600;
  }

  .misses .count::before,
  .misses .who::before,
  .misses .date::before {
    content: attr(data-label) ': ';
    font-size: var(--step--1);
    color: var(--muted);
  }

  .misses .who {
    grid-column: 1 / -1;
  }

  .misses .who .visitors {
    display: inline;
    margin-inline-start: var(--space-xs);
  }

  .misses .actions,
  .misses .details td {
    grid-column: 1 / -1;
    padding-block-start: var(--space-2xs);
  }
}
</style>
