<script setup lang="ts">
// Keyed so a page can refresh these numbers after an action: refreshNuxtData('admin-stats').
const { data: stats } = await useFetch('/api/admin', { key: 'admin-stats' })
</script>

<template>
  <nav aria-label="الإدارة">
    <ul>
      <li><NuxtLink to="/settings/admin">البلاغات<template v-if="stats"> ({{ stats.openFlags }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/proposals">الاقتراحات<template v-if="stats"> ({{ stats.pendingProposals }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/recent">آخر الإضافات</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/search-misses">بحث بلا نتيجة<template v-if="stats"> ({{ stats.searchMisses }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/daily">كلمة اليوم</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/users">الأعضاء<template v-if="stats?.users"> ({{ stats.users }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/import">استيراد</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/slugs">العناوين<template v-if="stats"> ({{ stats.slugs }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/stats">الأرقام</NuxtLink></li>
    </ul>
  </nav>
</template>
