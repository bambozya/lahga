<script setup lang="ts">
/** Add an example to `entryId`, or edit `example`. */
const props = defineProps<{ entryId: number, example?: { id: number, text: string, gloss?: string | null } }>()
const emit = defineEmits<{ done: [], cancel: [] }>()
const uid = useId()
const form = reactive({ text: props.example?.text ?? '', gloss: props.example?.gloss ?? '', reason: '' })
const { busy, error, run } = useForm(async () => {
  if (props.example) await $fetch(`/api/examples/${props.example.id}`, { method: 'PATCH', body: form })
  else await $fetch('/api/examples', { method: 'POST', body: { entryId: props.entryId, text: form.text, gloss: form.gloss } })
  emit('done')
})
</script>

<template>
  <form @submit.prevent="run">
    <fieldset :disabled="busy">
      <legend>{{ example ? 'تعديل المثال' : 'أضف مثالاً' }}</legend>
      <p role="alert" v-if="error">{{ error }}</p>
      <p>
        <label :for="`${uid}-text`">جملة باللهجة تُظهر الكلمة في سياقها</label>
        <textarea :id="`${uid}-text`" v-model="form.text" required maxlength="400" rows="2"></textarea>
      </p>
      <p>
        <label :for="`${uid}-gloss`">شرحها بالفصحى <small>(اختياري)</small></label>
        <input :id="`${uid}-gloss`" v-model="form.gloss" maxlength="400" />
      </p>
      <p v-if="example">
        <label :for="`${uid}-reason`">سبب التعديل <small>(اختياري)</small></label>
        <input :id="`${uid}-reason`" v-model="form.reason" maxlength="200" />
      </p>
      <p><button type="submit">{{ example ? 'حفظ' : 'إضافة' }}</button> <button type="button" @click="emit('cancel')">إلغاء</button></p>
    </fieldset>
  </form>
</template>
