<script setup lang="ts">
definePageMeta({ middleware: 'guest' })
useSeo({ title: 'تسجيل الدخول', noindex: true })
const route = useRoute()
const { fetch: refresh } = useUserSession()
const form = reactive({ email: '', password: '' })
const { busy, error, run } = useForm(async () => {
  await $fetch('/api/auth/login', { method: 'POST', body: form })
  await refresh()
  await navigateTo(typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/')
})
const urlError = computed(() => ({
  'google': 'تعذر تسجيل الدخول بحساب Google، حاول مرة أخرى',
  'google-email': 'حساب Google هذا ليس له بريد إلكتروني مؤكد',
  'deleted': 'هذا الحساب محذوف',
  'banned': 'هذا الحساب موقوف',
} as Record<string, string>)[String(route.query.error)] ?? '')
</script>

<template>
  <article>
    <h1>تسجيل الدخول</h1>
    <p role="alert" v-if="error || urlError">{{ error || urlError }}</p>
    <form @submit.prevent="run">
      <fieldset :disabled="busy">
        <legend>بالبريد الإلكتروني</legend>
        <p>
          <label for="email">البريد الإلكتروني</label>
          <input id="email" v-model="form.email" type="email" autocomplete="email" required dir="ltr" />
        </p>
        <p>
          <label for="password">كلمة المرور</label>
          <input id="password" v-model="form.password" type="password" autocomplete="current-password" required dir="ltr" />
        </p>
        <!-- Icon: Material Symbols (Apache 2.0): login. -->
        <p><button type="submit"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z" /></svg>دخول</button></p>
      </fieldset>
    </form>
    <GoogleButton />
    <p><NuxtLink to="/reset">نسيت كلمة المرور؟</NuxtLink></p>
    <p>ليس لديك حساب؟ <NuxtLink to="/register">أنشئ حساباً</NuxtLink></p>
  </article>
</template>
