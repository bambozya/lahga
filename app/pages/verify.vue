<script setup lang="ts">
useHead({ title: 'تأكيد البريد - لهجة' })
const route = useRoute()
const { loggedIn, user, fetch: refresh } = useUserSession()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const state = ref<'checking' | 'ok' | 'bad' | 'none'>(token ? 'checking' : 'none')
const sent = ref(false)

// Only in the browser: the link is clicked by a person, and the token must be used exactly once.
onMounted(async () => {
  if (!token) return
  try {
    await $fetch('/api/auth/verify', { method: 'POST', body: { token } })
    await refresh()
    state.value = 'ok'
  } catch { state.value = 'bad' }
})
const { busy, error, run: resend } = useForm(async () => {
  await $fetch('/api/auth/resend', { method: 'POST' })
  sent.value = true
})
</script>

<template>
  <article>
    <h1>تأكيد البريد الإلكتروني</h1>
    <p v-if="state === 'checking'">جارٍ التحقق…</p>
    <template v-else-if="state === 'ok'">
      <p role="status">تم تأكيد بريدك الإلكتروني. أهلاً بك في لهجة.</p>
      <p><NuxtLink to="/add-word">أضف كلمتك الأولى</NuxtLink> أو <NuxtLink to="/">عد إلى الرئيسية</NuxtLink>.</p>
    </template>
    <template v-else>
      <p role="alert" v-if="state === 'bad'">الرابط غير صالح أو انتهت صلاحيته.</p>
      <template v-if="loggedIn && !user?.emailVerified">
        <p v-if="sent" role="status">أرسلنا رابطاً جديداً إلى بريدك.</p>
        <template v-else>
          <p>يمكنك طلب رابط تأكيد جديد. الرابط صالح لمدة ساعة.</p>
          <p role="alert" v-if="error">{{ error }}</p>
          <p><button type="button" :disabled="busy" @click="resend">أرسل رابطاً جديداً</button></p>
        </template>
      </template>
      <p v-else-if="loggedIn">بريدك مؤكد بالفعل.</p>
      <p v-else><NuxtLink to="/login">سجّل الدخول</NuxtLink> لطلب رابط جديد.</p>
    </template>
  </article>
</template>
