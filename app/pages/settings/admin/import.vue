<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: استيراد', noindex: true })
const text = ref('')
const report = ref<any>(null)
const mode = ref<'dry' | 'real'>('dry')
const onFile = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) text.value = await f.text()
}
const { busy, error, run } = useForm(async () => {
  report.value = null
  let data: any
  try { data = JSON.parse(text.value) } catch { throw new Error('الملف ليس JSON صالحاً') }
  const words = Array.isArray(data) ? data : data?.words
  if (!Array.isArray(words)) throw new Error('المتوقع قائمة كلمات أو كائن فيه حقل words')
  report.value = await $fetch('/api/admin/import', { method: 'POST', body: { words, dryRun: mode.value === 'dry' } })
})
const check = () => { mode.value = 'dry'; run() }
const doImport = () => { if (confirm('استيراد الكلمات إلى الموقع؟')) { mode.value = 'real'; run() } }
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'استيراد' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>استيراد كلمات</h2>
    <p>ألصق ملف JSON بالصيغة الموضحة في <code dir="ltr">docs/seed/FORMAT.md</code> أو اختره من جهازك. «تحقق» يفحص دون حفظ؛ «استيراد» يحفظ باسم حساب الموقع «لهجة».</p>
    <form @submit.prevent="check">
      <fieldset :disabled="busy">
        <legend>الملف</legend>
        <p role="alert" v-if="error">{{ error }}</p>
        <p><label for="file">ملف JSON</label> <input id="file" type="file" accept=".json,application/json" @change="onFile" /></p>
        <p>
          <label for="json">أو النص</label>
          <textarea id="json" v-model="text" rows="12" dir="ltr" style="font-family: monospace" required></textarea>
        </p>
        <p><button type="submit">تحقق</button> <button type="button" :disabled="!report || report.errors?.length" @click="doImport">استيراد</button></p>
      </fieldset>
    </form>
    <section v-if="report">
      <h3>{{ mode === 'dry' ? 'نتيجة التحقق' : 'تم الاستيراد' }}</h3>
      <table>
        <tbody>
          <tr><th>كلمات جديدة</th><td>{{ report.wordsCreated }}</td></tr>
          <tr><th>كلمات مدمجة في موجودة</th><td>{{ report.wordsMerged }}</td></tr>
          <tr><th>مداخل</th><td>{{ report.entriesCreated }}</td></tr>
          <tr><th>مداخل مدمجة في موجودة</th><td>{{ report.entriesMerged }}</td></tr>
          <tr><th>مداخل رُبطت بكلمة أخرى</th><td>{{ report.entriesLinked }}</td></tr>
          <tr><th>مداخل اكتملت بياناتها</th><td>{{ report.entriesFilled }}</td></tr>
          <tr><th>أمثلة</th><td>{{ report.examplesCreated }}</td></tr>
          <tr><th>أمثلة متخطاة (موجودة)</th><td>{{ report.examplesSkipped }}</td></tr>
          <tr><th>أخطاء</th><td>{{ report.errors.length }}</td></tr>
        </tbody>
      </table>
      <ul v-if="report.errors.length">
        <li v-for="e in report.errors" :key="e.index">#{{ e.index + 1 }} <b v-if="e.headword">{{ e.headword }}</b>: {{ e.message }}</li>
      </ul>
      <p v-if="mode === 'dry' && !report.errors.length" role="status">لا أخطاء. يمكنك الاستيراد.</p>
    </section>
  </article>
</template>
