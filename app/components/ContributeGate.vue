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
  <p v-else-if="loggedIn">
    <NuxtLink class="cta" to="/settings">أكّد بريدك الإلكتروني</NuxtLink>
    <small>خطوة واحدة قبل الإضافة؛ الرابط في بريدك أو في الإعدادات.</small>
  </p>
  <p v-else>
    <NuxtLink class="cta" :to="{ path: '/login', query: { next: route.fullPath } }">سجّل الدخول لتضيف</NuxtLink>
    <small>أو <NuxtLink to="/register">أنشئ حساباً</NuxtLink> في دقيقة، ثم تعود إلى هذه الصفحة.</small>
  </p>
</template>
