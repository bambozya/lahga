<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { user } = useUserSession()
const { data: word, error } = await useFetch(`/api/words/${route.params.id}` as `/api/words/${number}`)
if (error.value || !word.value) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
if (user.value?.id !== word.value.createdBy && user.value?.role !== 'admin') {
  throw createError({ statusCode: 403, statusMessage: 'يمكنك تعديل ما أضفته أنت فقط', fatal: true })
}
useSeo({ title: () => `تعديل ${word.value?.headword ?? ''}`, noindex: true })
const form = reactive({ headword: word.value.headword, definition: word.value.definition ?? '', kind: word.value.kind, reason: '' })
const { busy, error: failure, run } = useForm(async () => {
  await $fetch(`/api/words/${word.value!.id}`, { method: 'PATCH', body: form })
  await navigateTo(`/w/${word.value!.id}`)
})
</script>

<template>
  <article>
    <h1>تعديل الكلمة</h1>
    <p role="alert" v-if="failure">{{ failure }}</p>
    <form @submit.prevent="run">
      <fieldset :disabled="busy">
        <legend>بالفصحى</legend>
        <p>
          <label for="headword">الكلمة أو العبارة</label>
          <input id="headword" v-model="form.headword" required maxlength="80" />
        </p>
        <p>
          <label for="definition">التعريف <small>(اختياري)</small></label>
          <textarea id="definition" v-model="form.definition" maxlength="600" rows="3"></textarea>
        </p>
        <p>
          <label for="kind">النوع</label>
          <select id="kind" v-model="form.kind">
            <option value="word">كلمة</option>
            <option value="phrase">عبارة</option>
            <option value="proverb">مثل شعبي</option>
          </select>
        </p>
        <p>
          <label for="reason">سبب التعديل <small>(اختياري)</small></label>
          <input id="reason" v-model="form.reason" maxlength="200" />
        </p>
        <p><button type="submit">حفظ</button> <NuxtLink :to="`/w/${word?.id}`">إلغاء</NuxtLink></p>
      </fieldset>
    </form>
  </article>
</template>
