<script setup lang="ts">
useSeo({ title: 'إعادة تعيين كلمة المرور', noindex: true })
const route = useRoute()
const { fetch: refresh } = useUserSession()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const email = ref('')
const password = ref('')
const requested = ref(false)

const request = useForm(async () => {
  await $fetch('/api/auth/reset-request', { method: 'POST', body: { email: email.value } })
  requested.value = true
})
const reset = useForm(async () => {
  await $fetch('/api/auth/reset', { method: 'POST', body: { token: token.value, password: password.value } })
  await refresh()
  await navigateTo('/settings?reset=1')
})
</script>

<template>
  <article>
    <h1>إعادة تعيين كلمة المرور</h1>

    <template v-if="token">
      <p role="alert" v-if="reset.error.value">{{ reset.error.value }}</p>
      <form @submit.prevent="reset.run">
        <fieldset :disabled="reset.busy.value">
          <legend>كلمة مرور جديدة</legend>
          <p>
            <label for="password">كلمة المرور الجديدة</label>
            <input id="password" v-model="password" type="password" autocomplete="new-password" required minlength="8" dir="ltr" />
          </p>
          <p><button type="submit">حفظ والدخول</button></p>
        </fieldset>
      </form>
    </template>

    <template v-else-if="requested">
      <p role="status">إن كان هذا البريد مسجلاً لدينا فقد أرسلنا إليه رابط إعادة التعيين. الرابط صالح لمدة ساعة.</p>
    </template>

    <template v-else>
      <p>أدخل بريدك الإلكتروني وسنرسل إليك رابطاً لاختيار كلمة مرور جديدة.</p>
      <p role="alert" v-if="request.error.value">{{ request.error.value }}</p>
      <form @submit.prevent="request.run">
        <fieldset :disabled="request.busy.value">
          <legend>بريدك</legend>
          <p>
            <label for="email">البريد الإلكتروني</label>
            <input id="email" v-model="email" type="email" autocomplete="email" required dir="ltr" />
          </p>
          <p><button type="submit">أرسل الرابط</button></p>
        </fieldset>
      </form>
    </template>
  </article>
</template>
