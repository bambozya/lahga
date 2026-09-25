<script setup lang="ts">
const { data: stats } = await useFetch('/api/admin')
</script>

<template>
  <nav aria-label="الإدارة">
    <ul>
      <li><NuxtLink to="/settings/admin">البلاغات<template v-if="stats?.openFlags"> ({{ stats.openFlags }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/proposals">الاقتراحات<template v-if="stats?.pendingProposals"> ({{ stats.pendingProposals }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/recent">آخر الإضافات</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/search-misses">بحث بلا نتيجة</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/daily">كلمة اليوم</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/users">الأعضاء<template v-if="stats?.users"> ({{ stats.users }})</template></NuxtLink></li>
      <li><NuxtLink to="/settings/admin/import">استيراد</NuxtLink></li>
      <li><NuxtLink to="/settings/admin/stats">الأرقام</NuxtLink></li>
    </ul>
  </nav>
</template>
