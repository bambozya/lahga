<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: عمليات بحث بلا نتيجة', noindex: true })
type SortKey = 'date' | 'count'
const sort = ref<SortKey>('date')
const dir = ref<'desc' | 'asc'>('desc')
const { data: misses, refresh } = await useFetch('/api/admin/search-misses', {
  query: computed(() => ({ sort: sort.value, dir: dir.value })),
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
const busy = ref<number | null>(null)
const error = ref('')
const remove = async (id: number, term: string) => {
  if (!confirm(`حذف «${term.slice(0, 40)}» من القائمة؟`)) return
  busy.value = id; error.value = ''
  try { await $fetch(`/api/admin/search-misses/${id}`, { method: 'DELETE' }); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الحذف' }
  finally { busy.value = null }
}
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'بحث بلا نتيجة' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>عمليات بحث بلا نتيجة</h2>
    <p><small>ما كتبه الزوار ولم يجدوا له شيئاً، الأحدث أولاً. هذه قائمة بما يُضاف بعده من كلمات. اضغط على عنوان العمود لترتيبه.</small></p>
    <p role="alert" v-if="error">{{ error }}</p>
    <p v-if="!misses?.length">لا شيء بعد.</p>
    <table v-else class="misses">
      <thead>
        <tr>
          <th class="term-head">الكلمة المكتوبة</th>
          <th :aria-sort="ariaSort('count')"><button type="button" class="sort" @click="sortBy('count')">عدد المرات <span aria-hidden="true">{{ arrow('count') }}</span></button></th>
          <th :aria-sort="ariaSort('date')"><button type="button" class="sort" @click="sortBy('date')">آخر مرة <span aria-hidden="true">{{ arrow('date') }}</span></button></th>
          <th class="actions-head"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in misses" :key="m.id">
          <td class="term">{{ m.term }}</td>
          <td class="count" data-label="عدد المرات">{{ m.count }}</td>
          <td class="date" data-label="آخر مرة"><small><time :datetime="String(m.lastSearchedAt)">{{ fmt(m.lastSearchedAt) }}</time></small></td>
          <td class="actions">
            <NuxtLink :to="`/add-word?headword=${encodeURIComponent(m.term)}`">إضافة</NuxtLink>
            <button type="button" :disabled="busy === m.id" @click="remove(m.id, m.term)">حذف</button>
          </td>
        </tr>
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
  width: 8em;
}
.misses th:last-child {
  width: 8.5em;
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
  .misses .date::before {
    content: attr(data-label) ': ';
    font-size: var(--step--1);
    color: var(--muted);
  }
  .misses .actions {
    grid-column: 1 / -1;
    padding-block-start: var(--space-2xs);
  }
}
</style>
