<script setup lang="ts">
/** "Report this": a small disclosure with a reason and an optional comment. Logged-in users only. */
const props = defineProps<{ targetType: 'word' | 'entry' | 'link' | 'example', targetId: number }>()
const { loggedIn } = useUserSession()
const uid = useId()
const open = ref(false)
const sent = ref(false)
const form = reactive({ reason: 'other', comment: '' })
const reasons = [
  ['wrong_dialect', 'اللهجة غير صحيحة'],
  ['wrong_link', 'الربط بالفصحى غير صحيح'],
  ['offensive', 'محتوى مسيء'],
  ['spam', 'دعاية أو محتوى مكرر'],
  ['other', 'سبب آخر'],
] as const
const { busy, error, run } = useForm(async () => {
  await $fetch('/api/flags', { method: 'POST', body: { targetType: props.targetType, targetId: props.targetId, ...form } })
  sent.value = true
  open.value = false
})
</script>

<template>
  <span v-if="loggedIn">
    <small v-if="sent" role="status">شكراً، وصل بلاغك.</small>
    <template v-else>
      <small><a href="#" @click.prevent="open = !open">إبلاغ</a></small>
      <form v-if="open" @submit.prevent="run">
        <fieldset :disabled="busy">
          <legend>الإبلاغ عن مشكلة</legend>
          <p role="alert" v-if="error">{{ error }}</p>
          <p>
            <label :for="`${uid}-reason`">السبب</label>
            <select :id="`${uid}-reason`" v-model="form.reason">
              <option v-for="[value, label] in reasons" :key="value" :value="value">{{ label }}</option>
            </select>
          </p>
          <p>
            <label :for="`${uid}-comment`">توضيح <small>(اختياري)</small></label>
            <input :id="`${uid}-comment`" v-model="form.comment" maxlength="500" />
          </p>
          <p><button type="submit">أرسل البلاغ</button> <button type="button" @click="open = false">إلغاء</button></p>
        </fieldset>
      </form>
    </template>
  </span>
</template>
