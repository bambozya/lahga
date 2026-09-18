<script setup lang="ts">
/**
 * Add or edit a dialect entry. With `entry` it edits (PATCH), otherwise it adds one
 * to `wordId` (POST). Emits `done` after a successful save, `cancel` on cancel.
 */
const props = defineProps<{
  wordId: number
  entry?: { id: number, form: string, meaning: string, notes?: string | null, dialect: { slug: string } }
}>()
const emit = defineEmits<{ done: [], cancel: [] }>()
const uid = useId()
const form = reactive({
  dialect: props.entry?.dialect.slug ?? '',
  form: props.entry?.form ?? '',
  meaning: props.entry?.meaning ?? '',
  notes: props.entry?.notes ?? '',
  exampleText: '',
  exampleGloss: '',
  reason: '',
})
const { busy, error, run } = useForm(async () => {
  if (props.entry) {
    await $fetch(`/api/entries/${props.entry.id}`, { method: 'PATCH', body: { dialect: form.dialect, form: form.form, meaning: form.meaning, notes: form.notes, reason: form.reason } })
  } else {
    await $fetch('/api/entries', { method: 'POST', body: {
      wordId: props.wordId, dialect: form.dialect, form: form.form, meaning: form.meaning, notes: form.notes,
      example: form.exampleText.trim() ? { text: form.exampleText, gloss: form.exampleGloss } : undefined,
    } })
  }
  emit('done')
})
</script>

<template>
  <form @submit.prevent="run">
    <fieldset :disabled="busy">
      <legend>{{ entry ? 'تعديل المدخل' : 'أضف شكلها في لهجتك' }}</legend>
      <p role="alert" v-if="error">{{ error }}</p>
      <p>
        <label :for="`${uid}-dialect`">اللهجة</label>
        <DialectSelect :id="`${uid}-dialect`" v-model="form.dialect" />
      </p>
      <p>
        <label :for="`${uid}-form`">الكلمة كما تُقال في لهجتك</label>
        <input :id="`${uid}-form`" v-model="form.form" required maxlength="80" />
      </p>
      <p>
        <label :for="`${uid}-meaning`">المعنى</label>
        <textarea :id="`${uid}-meaning`" v-model="form.meaning" required maxlength="400" rows="2"></textarea>
      </p>
      <p>
        <label :for="`${uid}-notes`">ملاحظات <small>(اختيارية)</small></label>
        <textarea :id="`${uid}-notes`" v-model="form.notes" maxlength="400" rows="2"></textarea>
        <small>متى تُستعمل، ومن يقولها، وما لونها: عامية، مهذبة، ساخرة…</small>
      </p>
      <template v-if="!entry">
        <p>
          <label :for="`${uid}-ex`">مثال <small>(اختياري)</small></label>
          <textarea :id="`${uid}-ex`" v-model="form.exampleText" maxlength="400" rows="2"></textarea>
        </p>
        <p>
          <label :for="`${uid}-gloss`">شرح المثال بالفصحى <small>(اختياري)</small></label>
          <input :id="`${uid}-gloss`" v-model="form.exampleGloss" maxlength="400" />
        </p>
      </template>
      <p v-else>
        <label :for="`${uid}-reason`">سبب التعديل <small>(اختياري)</small></label>
        <input :id="`${uid}-reason`" v-model="form.reason" maxlength="200" />
      </p>
      <p><button type="submit">{{ entry ? 'حفظ' : 'إضافة' }}</button> <button type="button" @click="emit('cancel')">إلغاء</button></p>
    </fieldset>
  </form>
</template>
