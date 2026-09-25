<script setup lang="ts">
useSeo({ title: 'اتصل بنا', description: 'راسل فريق لهجة باقتراحاتك وملاحظاتك على معجم اللهجات العربية.' })
const form = reactive({ name: '', email: '', subject: '', message: '', website: '' })
const sent = ref(false)
const { busy, error, run } = useForm(async () => {
  await $fetch('/api/contact', { method: 'POST', body: form })
  sent.value = true
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'اتصل بنا' }]" />
    <h1>اتصل بنا</h1>
    <p>نرحب بأسئلتكم واقتراحاتكم وملاحظاتكم. يمكنكم التواصل معنا من خلال النموذج أو عبر البريد.</p>
    <address>البريد الإلكتروني: <a href="mailto:info@lahga.fyi">info@lahga.fyi</a></address>
    <p>نسعى للرد على جميع الاستفسارات خلال يومين من أيام العمل.</p>

    <p v-if="sent" role="status">تم إرسال رسالتك. سنتواصل معك قريباً.</p>
    <form v-else @submit.prevent="run">
      <fieldset :disabled="busy">
        <legend>نموذج الاتصال</legend>
        <p role="alert" v-if="error">{{ error }}</p>
        <p>
          <label for="name">الاسم</label>
          <input id="name" v-model="form.name" name="name" autocomplete="name" required maxlength="80" />
        </p>
        <p>
          <label for="email">البريد الإلكتروني</label>
          <input id="email" v-model="form.email" name="email" type="email" autocomplete="email" required dir="ltr" />
        </p>
        <p>
          <label for="subject">الموضوع</label>
          <input id="subject" v-model="form.subject" name="subject" required maxlength="150" />
        </p>
        <p>
          <label for="message">الرسالة</label>
          <textarea id="message" v-model="form.message" name="message" required minlength="10" maxlength="4000"></textarea>
        </p>
        <p hidden aria-hidden="true"><label>الموقع الإلكتروني <input v-model="form.website" name="website" tabindex="-1" autocomplete="off" /></label></p>
        <p><button type="submit">إرسال الرسالة</button></p>
      </fieldset>
    </form>
  </article>
</template>
