<script setup lang="ts">
// Validation is the browser's: required, type="email". The handler only runs
// once the form is valid. There is no backend for messages yet.
const sent = ref(false)
const send = () => { sent.value = true }
useHead({ title: 'اتصل بنا - لهجة' })
</script>

<template>
  <article>
    <h1>اتصل بنا</h1>
    <p>نحن نرحب بأسئلتكم واقتراحاتكم وملاحظاتكم. يمكنكم التواصل معنا من خلال النموذج أو عبر البريد.</p>
    <address>البريد الإلكتروني: <a href="mailto:info@lahga.com">info@lahga.com</a></address>
    <p>نسعى للرد على جميع الاستفسارات خلال يومين من أيام العمل.</p>

    <p v-if="sent" role="status">تم إرسال رسالتك. سنتواصل معك قريباً.</p>
    <form v-else @submit.prevent="send">
      <fieldset>
        <legend>نموذج الاتصال</legend>
        <p>
          <label for="name">الاسم</label>
          <input id="name" name="name" autocomplete="name" required />
        </p>
        <p>
          <label for="email">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </p>
        <p>
          <label for="subject">الموضوع</label>
          <input id="subject" name="subject" required />
        </p>
        <p>
          <label for="message">الرسالة</label>
          <textarea id="message" name="message" required></textarea>
        </p>
        <p><button type="submit">إرسال الرسالة</button></p>
      </fieldset>
    </form>
  </article>
</template>
