<script setup lang="ts">
const { data: stats } = await useFetch('/api/admin')
</script>

<template>
  <nav aria-label="الإدارة">
    <ul>
      <li><NuxtLink to="/admin">البلاغات<template v-if="stats?.openFlags"> ({{ stats.openFlags }})</template></NuxtLink></li>
      <li><NuxtLink to="/admin/proposals">الاقتراحات<template v-if="stats?.pendingProposals"> ({{ stats.pendingProposals }})</template></NuxtLink></li>
      <li><NuxtLink to="/admin/recent">آخر الإضافات</NuxtLink></li>
      <li><NuxtLink to="/admin/users">الأعضاء<template v-if="stats?.users"> ({{ stats.users }})</template></NuxtLink></li>
      <li><NuxtLink to="/admin/import">استيراد</NuxtLink></li>
    </ul>
  </nav>
</template>
