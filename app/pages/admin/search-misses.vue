<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: عمليات بحث بلا نتيجة', noindex: true })
const { data: misses } = await useFetch('/api/admin/search-misses')
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
</script>

<template>
  <article>
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>عمليات بحث بلا نتيجة</h2>
    <p><small>ما كتبه الزوار ولم يجدوا له شيئاً، الأكثر تكراراً أولاً. هذه قائمة بما يُضاف بعده من كلمات.</small></p>
    <p v-if="!misses?.length">لا شيء بعد.</p>
    <table v-else>
      <thead>
        <tr><th>الكلمة المكتوبة</th><th>عدد المرات</th><th>آخر مرة</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="m in misses" :key="m.id">
          <td>{{ m.term }}</td>
          <td>{{ m.count }}</td>
          <td><small><time :datetime="String(m.lastSearchedAt)">{{ fmt(m.lastSearchedAt) }}</time></small></td>
          <td><NuxtLink :to="`/add-word?headword=${encodeURIComponent(m.term)}`">إضافة</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
