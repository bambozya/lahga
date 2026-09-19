<script setup lang="ts">
// Adding a word needs a verified account, but a visitor who lands here from a
// search that found nothing is told so on the page rather than bounced to the
// login form and left to find the way back: ContributeGate carries ?headword=
// into the link, so the form is waiting, filled in, when they return.
useSeo({ title: 'أضف كلمة', description: 'أضف كلمة من لهجتك إلى قاموس لهجة: اربطها بمعناها بالفصحى واذكر مثالاً على استعمالها.', noindex: true })
// A search that found nothing sends the term along (?headword=…), so the page
// opens on the word the visitor was already looking for.
const headword = String(useRoute().query.headword ?? '').trim().slice(0, 80)
const form = reactive({
  headword, definition: '', kind: 'word' as 'word' | 'phrase' | 'proverb',
  dialect: '', form: '', meaning: '', notes: '', exampleText: '', exampleGloss: '',
})
const existingId = ref<number | null>(null)
const { busy, error, run } = useForm(async () => {
  existingId.value = null
  try {
    const { id } = await $fetch('/api/words', { method: 'POST', body: {
      headword: form.headword, definition: form.definition, kind: form.kind,
      dialect: form.dialect, form: form.form, meaning: form.meaning, notes: form.notes,
      example: form.exampleText.trim() ? { text: form.exampleText, gloss: form.exampleGloss } : undefined,
    } })
    await navigateTo(`/w/${id}?added=1`)
  } catch (e: any) {
    if (e?.statusCode === 409 && e?.data?.data?.wordId) existingId.value = e.data.data.wordId
    throw e
  }
})
</script>

<template>
  <article>
    <h1>أضف كلمة</h1>
    <p>كل كلمة تُربط بمعناها بالفصحى، ثم يُضاف الشكل الذي تُقال به في لهجتك مع مثال. هكذا تظهر الكلمة نفسها بجانب مرادفاتها في اللهجات الأخرى.</p>
    <ContributeGate>
      <p role="alert" v-if="error">
        {{ error }}
        <template v-if="existingId"> <NuxtLink :to="`/w/${existingId}`">افتح صفحة الكلمة</NuxtLink>.</template>
      </p>
      <form @submit.prevent="run">
        <fieldset :disabled="busy">
          <legend>بالفصحى</legend>
          <p>
            <label for="headword">الكلمة أو العبارة بالفصحى</label>
            <input id="headword" v-model="form.headword" required maxlength="80" />
            <small>المعنى المشترك الذي تلتقي عنده اللهجات، مثل «سيارة» أو «كثيراً».</small>
          </p>
          <p>
            <label for="definition">التعريف <small>(اختياري)</small></label>
            <textarea id="definition" v-model="form.definition" maxlength="600" rows="3"></textarea>
            <small>اتركه فارغاً إذا كانت الكلمة تشرح نفسها، مثل «ماء» أو «باب».</small>
          </p>
          <p>
            <label for="kind">النوع</label>
            <select id="kind" v-model="form.kind">
              <option value="word">كلمة</option>
              <option value="phrase">عبارة</option>
              <option value="proverb">مثل شعبي</option>
            </select>
          </p>
        </fieldset>
        <fieldset :disabled="busy">
          <legend>في لهجتك</legend>
          <p>
            <label for="dialect">اللهجة</label>
            <DialectSelect id="dialect" v-model="form.dialect" />
          </p>
          <p>
            <label for="form">الكلمة كما تُقال في لهجتك</label>
            <input id="form" v-model="form.form" required maxlength="80" />
          </p>
          <p>
            <label for="meaning">المعنى <small>(اختياري)</small></label>
            <textarea id="meaning" v-model="form.meaning" maxlength="400" rows="2"></textarea>
            <small>تعريف الكلمة بالفصحى يغني عنه غالباً؛ اكتبه إن كان لها في لهجتك معنى أخص أو استعمال مختلف.</small>
          </p>
          <p>
            <label for="notes">ملاحظات <small>(اختيارية)</small></label>
            <textarea id="notes" v-model="form.notes" maxlength="400" rows="2"></textarea>
            <small>متى تُستعمل، ومن يقولها، وما لونها: عامية، مهذبة، ساخرة…</small>
          </p>
          <p>
            <label for="example">مثال <small>(اختياري، لكنه يفيد كثيراً)</small></label>
            <textarea id="example" v-model="form.exampleText" maxlength="400" rows="2"></textarea>
          </p>
          <p>
            <label for="gloss">شرح المثال بالفصحى <small>(اختياري)</small></label>
            <input id="gloss" v-model="form.exampleGloss" maxlength="400" />
          </p>
        </fieldset>
        <p><button type="submit">أضف الكلمة</button></p>
      </form>
    </ContributeGate>

    <!-- Someone who came to add a word can usually do something smaller and
         more useful instead, and rarely knows it. Every line here is a door
         that already exists somewhere on the site. -->
    <section class="more">
      <h2>وللقاموس أبواب أخرى</h2>
      <p>الإضافة ليست الطريق الوحيد؛ من صفحة أي كلمة أو لهجة يمكنك:</p>
      <ul>
        <li>أن تضيف شكل الكلمة في لهجتك إلى كلمة موجودة، أو مثالاً على استعمالها.</li>
        <li>أن تقترح وصفاً أدق للهجة من <NuxtLink to="/dialects">صفحتها</NuxtLink>، فيُراجَع ويُنشر باسمك.</li>
        <li>أن تُبلغ عن خطأ: لهجة غير صحيحة، أو ربط خاطئ بالفصحى، أو محتوى مسيء.</li>
        <li>أن تعدّل أو تحذف ما أضفته أنت، متى شئت.</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
/* The other doors are an afterword, not a second invitation: ruled off, and
   quieter than the form above them. */
.more { border-block-start: var(--rule); padding-block-start: var(--space-s); }
.more > h2 { font-size: var(--step-1); }
.more :is(p, li) { color: var(--muted); }
</style>
