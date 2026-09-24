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
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
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
          <th>الكلمة المكتوبة</th>
          <th :aria-sort="ariaSort('count')"><button type="button" class="sort" @click="sortBy('count')">عدد المرات <span aria-hidden="true">{{ arrow('count') }}</span></button></th>
          <th :aria-sort="ariaSort('date')"><button type="button" class="sort" @click="sortBy('date')">آخر مرة <span aria-hidden="true">{{ arrow('date') }}</span></button></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in misses" :key="m.id">
          <td class="term">{{ m.term }}</td>
          <td>{{ m.count }}</td>
          <td><small><time :datetime="String(m.lastSearchedAt)">{{ fmt(m.lastSearchedAt) }}</time></small></td>
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
.misses th:nth-child(2),
.misses th:nth-child(3) {
  width: 6em;
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
</style>
