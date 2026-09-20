<script setup lang="ts">
const route = useRoute()
const { loggedIn, user } = useUserSession()
// The literal type narrows the URL to the [id] route for typing.
const { data: word, error, refresh } = await useFetch(`/api/words/${route.params.id}` as `/api/words/${number}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
// The same glance a result card shows: each form once, with everyone who says it.
const forms = computed(() => formsOf(word.value?.groups.flatMap(g => g.entries) ?? []))
const kindWord = computed(() => ({ word: 'كلمة', phrase: 'عبارة', proverb: 'مثل' })[word.value?.kind ?? 'word'])
useSeo({
  // The title carries the dialect forms, because that is what people type into a search box.
  title: () => {
    if (!word.value) return ''
    const list = forms.value.slice(0, 5).map(f => f.form).join('، ')
    return list ? `${word.value.headword} بالعامية: ${list}` : `${word.value.headword} في اللهجات العربية`
  },
  description: () => {
    if (!word.value) return ''
    const list = forms.value.map(f => `${f.form} (${f.dialects.join('، ')})`).join('، ')
    const head = `كيف تُقال «${word.value.headword}» في اللهجات العربية؟`
    return list ? `${head} ${list}.` : `${head} ${word.value.definition ?? ''}`.trim()
  },
  jsonLd: () => {
    if (!word.value) return undefined
    return [{
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: word.value.headword,
      description: word.value.definition,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'لهجة، قاموس اللهجات العربية', url: 'https://lahga.fyi' },
      url: `https://lahga.fyi/w/${word.value.id}`,
      inLanguage: 'ar',
      ...(forms.value.length ? { alternateName: forms.value.map(f => f.form) } : {}),
    }]
    // The BreadcrumbList that used to be declared here now comes from the
    // BreadCrumbs component, so the trail search engines read is the same one
    // the page shows rather than a second copy kept in step by hand.
  },
  image: () => word.value ? `/og/w/${word.value.id}.png` : undefined,
})

const kindLabel = { word: '', phrase: 'عبارة', proverb: 'مثل شعبي' } as const
const mine = (createdBy: number | null | undefined) => loggedIn.value && (user.value?.id === createdBy || user.value?.role === 'admin')

// Which inline form is open: one at a time keeps the page calm.
const open = ref<string | null>(null)
const toggle = (key: string) => { open.value = open.value === key ? null : key }
const done = async () => { open.value = null; await refresh() }

const notice = ref(route.query.added ? 'أُضيفت الكلمة. شكراً لك!' : '')
const failure = ref('')
const remove = async (kind: 'entries' | 'examples', id: number, what: string) => {
  if (!confirm(`حذف ${what}؟`)) return
  failure.value = ''
  try { await $fetch(`/api/${kind}/${id}`, { method: 'DELETE' }); await refresh() }
  catch (e: any) { failure.value = e?.data?.statusMessage || 'تعذر الحذف' }
}
const removeWord = async () => {
  if (!word.value || !confirm('حذف الكلمة وما أضفته إليها؟')) return
  failure.value = ''
  try { await $fetch(`/api/words/${word.value.id}`, { method: 'DELETE' }); await navigateTo('/?deleted=1') }
  catch (e: any) { failure.value = e?.data?.statusMessage || 'تعذر الحذف' }
}
</script>

<template>
  <article v-if="word">
    <BreadCrumbs :trail="[{ label: word.headword }]" />
    <p role="status" v-if="notice">{{ notice }}</p>
    <p role="alert" v-if="failure">{{ failure }}</p>

    <!-- The pivot: the word itself, what it means, and nothing competing with it. -->
    <hgroup class="pivot">
      <p><b>بالفصحى</b><template v-if="kindLabel[word.kind]"> · {{ kindLabel[word.kind] }}</template></p>
      <h1><dfn>{{ word.headword }}</dfn></h1>
      <p v-if="word.definition" class="definition">{{ word.definition }}</p>
    </hgroup>

    <!-- Every dialect form at a glance; the detail waits below. -->
    <p v-if="forms.length" class="glance">
      <span>تُقال:</span>
      <template v-for="(f, i) in forms" :key="f.form">
        <template v-if="i">، </template><a :href="`#entry-${f.entryId}`"><b>{{ f.form }}</b></a> <small>{{ f.dialects.join('، ') }}</small>
      </template>
    </p>

    <p class="tools">
      <small v-if="mine(word.createdBy)"><NuxtLink :to="`/w/${word.id}/edit`">تعديل الكلمة</NuxtLink> · <a href="#" @click.prevent="removeWord">حذف</a> · </small>
      <FlagButton target-type="word" :target-id="word.id" />
    </p>

    <section v-for="g in word.groups" :key="g.slug">
      <h2><NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink></h2>
      <dl>
        <div v-for="e in g.entries" :id="`entry-${e.id}`" :key="e.id">
          <dt>
            <b>{{ e.form }}</b>
            <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
          </dt>
          <dd>
            <template v-if="open === `entry-${e.id}`">
              <EntryForm :word-id="word.id" :entry="e" @done="done" @cancel="open = null" />
            </template>
            <template v-else>
              <p v-if="e.meaning">{{ e.meaning }}</p>
              <p v-if="e.notes"><small>{{ e.notes }}</small></p>
              <ul v-if="e.examples.length">
                <li v-for="x in e.examples" :key="x.id">
                  <template v-if="open === `example-${x.id}`">
                    <ExampleForm :entry-id="e.id" :example="x" @done="done" @cancel="open = null" />
                  </template>
                  <template v-else>
                    <q>{{ x.text }}</q>
                    <small v-if="x.gloss"> {{ x.gloss }}</small>
                    <small v-if="mine(x.createdBy)"> · <a href="#" @click.prevent="toggle(`example-${x.id}`)">تعديل</a> · <a href="#" @click.prevent="remove('examples', x.id, 'المثال')">حذف</a></small>
                  </template>
                </li>
              </ul>
              <p v-if="loggedIn"><small class="left">
                <template v-if="e.author">أضافها <NuxtLink :to="`/u/${e.author.id}`">{{ e.author.displayName }}</NuxtLink></template>
                <template v-if="mine(e.createdBy)"> · <a href="#" @click.prevent="toggle(`entry-${e.id}`)">تعديل</a> · <a href="#" @click.prevent="remove('entries', e.id, 'المدخل')">حذف</a></template>
                <template v-if="loggedIn && user?.emailVerified"> · <a href="#" @click.prevent="toggle(`add-example-${e.id}`)">أضف مثالاً</a></template>
              </small></p>
              <ExampleForm v-if="open === `add-example-${e.id}`" :entry-id="e.id" @done="done" @cancel="open = null" />
              <FlagButton target-type="entry" :target-id="e.id" />
            </template>
          </dd>
        </div>
      </dl>
    </section>

    <p v-if="!word.groups.length">لم تُضف بعد أشكال هذه {{ kindWord }} في اللهجات.</p>

    <section class="contribute">
      <h2>كيف تُقال في لهجتك؟</h2>
      <ContributeGate>
        <EntryForm v-if="open === 'add-entry'" :word-id="word.id" @done="done" @cancel="open = null" />
        <p v-else><button type="button" @click="toggle('add-entry')">أضف شكلها في لهجتك</button></p>
      </ContributeGate>
      <p><small><NuxtLink :to="`/w/${word.id}/history`">سجل التعديلات</NuxtLink></small></p>
    </section>
  </article>
</template>

<style scoped>
/* The headword is the page. Everything under it is evidence, set quieter. */
.pivot { border-block-end: var(--thin); padding-block-end: var(--space-s); }
.pivot > h1 { font-size: var(--step-5); line-height: 1.2; margin-block-start: var(--space-3xs); }
.pivot > .definition { font-size: var(--step-1); margin-block-start: var(--space-2xs); }

/* The glance itself is styled in main.css, shared with the result cards; here
   it only needs the air that separates it from the headword above. */
.glance { margin-block-start: var(--space-s); border-block-end: var(--rule); padding-block-end: var(--space-s); }

.tools { margin-block-start: var(--space-xs); }

/* A region is a label over its entries, not a headline. */
section > h2 { font: 700 var(--step-0)/1.6 var(--naskh); color: var(--muted); }
section > h2 a { text-decoration-color: var(--hair); }
/* The invitation to contribute is not a label: it keeps its voice. */
.contribute > h2 { font: 700 var(--step-2)/1.45 var(--naskh); color: var(--ink); }

/* Each form: named, explained, evidenced — but never louder than the headword.
   No rule under a dialect's name: inside one dialect the forms are kin, held
   apart by space alone. The fine line belongs between one dialect and the next. */
section + section { border-block-start: var(--thin); padding-block-start: var(--space-m); }
section + section:last-child { border-block-start: var(--rule); }
dl > div { border-block-start: 0; padding-block: 0; scroll-margin-block-start: var(--space-s); }
dl > div + div { margin-block-start: var(--space-m); }
dt { font: 700 var(--step-1)/1.5 var(--naskh); }

.left { text-align: left; }
</style>
