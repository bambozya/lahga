<script setup lang="ts">
/**
 * Wraps anything that needs a verified account. Shows the content to verified
 * users and a short explanation with the right link to everyone else.
 */
const { loggedIn, user } = useUserSession()
const route = useRoute()
</script>

<template>
  <slot v-if="loggedIn && user?.emailVerified" />
  <p v-else-if="loggedIn"><small>أكّد بريدك الإلكتروني لتتمكن من الإضافة. تجد الرابط في بريدك أو في <NuxtLink to="/settings">الإعدادات</NuxtLink>.</small></p>
  <p v-else><small><NuxtLink :to="{ path: '/login', query: { next: route.fullPath } }">سجّل الدخول</NuxtLink> أو <NuxtLink to="/register">أنشئ حساباً</NuxtLink> لتضيف إلى هذه الصفحة.</small></p>
</template>
