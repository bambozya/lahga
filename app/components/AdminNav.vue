<script setup lang="ts">
// Keyed so a page can refresh these numbers after an action: refreshNuxtData('admin-stats').
const { data: stats } = await useFetch('/api/admin', { key: 'admin-stats' })
// Below this many curated days ahead, every admin page says so (roadmap A8).
const QUEUE_WARNING = 14
</script>

<template>
  <nav aria-label="الإدارة">
    <ul>
      <li><NuxtLink to="/settings/admin">البلاغات<template v-if="stats"> ({{ stats.openFlags }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/proposals">الاقتراحات<template v-if="stats"> ({{ stats.pendingProposals }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/recent">آخر الإضافات</NuxtLink></li>
      <li><NuxtLink to="/review">بحاجة إلى تحقق</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/search-misses">بحث بلا نتيجة<template v-if="stats"> ({{ stats.searchMisses }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/daily">كلمة اليوم<template v-if="stats"> ({{ stats.dailyQueue }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/users">الأعضاء<template v-if="stats?.users"> ({{ stats.users }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/import">استيراد</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/slugs">العناوين<template v-if="stats"> ({{ stats.slugs }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/stats">الأرقام</NuxtLink></li>
    </ul>
  </nav>
  <p v-if="stats && stats.dailyQueue < QUEUE_WARNING" role="status">
    <small>
      الأيام القادمة التي اختيرت كلمتها في <NuxtLink to="/settings/admin/daily">كلمة اليوم</NuxtLink>:
      {{ stats.dailyQueue }} من {{ QUEUE_WARNING }} على الأقل. بعدها يختار الموقع الكلمة بنفسه في يومها.
    </small>
  </p>
</template>
