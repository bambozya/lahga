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
    <!-- Icon: Material Symbols (Apache 2.0): login. -->
    <NuxtLink class="cta" :to="{ path: '/login', query: { next: route.fullPath } }"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z" /></svg>سجّل الدخول لتضيف</NuxtLink>
    <small>أو <NuxtLink to="/register">أنشئ حساباً</NuxtLink> في دقيقة، ثم عد إلى هذه الصفحة.</small>
  </p>
</template>
