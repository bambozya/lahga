<script setup lang="ts">
definePageMeta({ middleware: 'guest' })
useSeo({ title: 'إنشاء حساب', description: 'أنشئ حساباً في لهجة لتضيف كلمات لهجتك وتصوّت على ما يضيفه غيرك.', noindex: true })
const { fetch: refresh } = useUserSession()
const siteKey = useRuntimeConfig().public.turnstileSiteKey
// Turnstile renders into the div and writes its token into a hidden input named cf-turnstile-response.
if (siteKey) useHead({ script: [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true, defer: true }] })
const formEl = ref<HTMLFormElement>()
const form = reactive({ displayName: '', email: '', password: '' })
const done = ref(false)
const mailSent = ref(true)
const { busy, error, run } = useForm(async () => {
  const turnstile = (formEl.value?.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value
  const res = await $fetch('/api/auth/register', { method: 'POST', body: { ...form, turnstile } })
  mailSent.value = res.mailSent
  await refresh()
  done.value = true
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'إنشاء حساب' }]" />
    <h1>إنشاء حساب</h1>
    <template v-if="done">
      <p v-if="mailSent" role="status">تم إنشاء حسابك. أرسلنا رابط تأكيد إلى بريدك الإلكتروني؛ افتحه لتتمكن من إضافة الكلمات.</p>
      <p v-else role="status">تم إنشاء حسابك، لكن تعذر إرسال رابط التأكيد الآن. <NuxtLink to="/verify">اطلب رابطاً جديداً</NuxtLink> بعد قليل لتتمكن من إضافة الكلمات.</p>
      <p><NuxtLink to="/">إلى الصفحة الرئيسية</NuxtLink></p>
    </template>
    <template v-else>
      <p>بحساب واحد يمكنك إضافة الكلمات والأمثلة والتصويت عليها. الاسم يظهر للجميع بجانب ما تضيفه.</p>
      <p role="alert" v-if="error">{{ error }}</p>
      <form ref="formEl" @submit.prevent="run">
        <fieldset :disabled="busy">
          <legend>بياناتك</legend>
          <p>
            <label for="name">الاسم الظاهر</label>
            <input id="name" v-model="form.displayName" autocomplete="nickname" required minlength="2" maxlength="40" />
            <small>بالحروف العربية، مثل «أم كلثوم» أو «سامي من حلب».</small>
          </p>
          <p>
            <label for="email">البريد الإلكتروني</label>
            <input id="email" v-model="form.email" type="email" autocomplete="email" required dir="ltr" />
          </p>
          <p>
            <label for="password">كلمة المرور</label>
            <input id="password" v-model="form.password" type="password" autocomplete="new-password" required minlength="8" dir="ltr" />
            <small>8 أحرف على الأقل.</small>
          </p>
          <div v-if="siteKey" class="cf-turnstile" :data-sitekey="siteKey" data-language="ar"></div>
          <p><button type="submit">إنشاء الحساب</button></p>
        </fieldset>
      </form>
      <GoogleButton />
      <p>بإنشاء حساب فإنك توافق على <NuxtLink to="/terms">شروط الاستخدام</NuxtLink> و<NuxtLink to="/privacy">سياسة الخصوصية</NuxtLink>.</p>
      <p>لديك حساب؟ <NuxtLink to="/login">سجّل الدخول</NuxtLink></p>
    </template>
  </article>
</template>
