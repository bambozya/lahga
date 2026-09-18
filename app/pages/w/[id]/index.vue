<script setup lang="ts">
const route = useRoute()
const { loggedIn, user } = useUserSession()
// The literal type narrows the URL to the [id] route for typing.
const { data: word, error, refresh } = await useFetch(`/api/words/${route.params.id}` as `/api/words/${number}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
// One line per distinct form, with every dialect that uses it: «الحين (خليجي، نجدي)».
const forms = computed(() => {
  const byForm = new Map<string, string[]>()
  for (const g of word.value?.groups ?? []) {
    for (const e of g.entries) {
      const list = byForm.get(e.form) ?? byForm.set(e.form, []).get(e.form)!
      if (!list.includes(e.dialect.nameAr)) list.push(e.dialect.nameAr)
    }
  }
  return [...byForm].map(([form, dialects]) => ({ form, dialects }))
})
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
    return list ? `${head} ${list}.` : `${head} ${word.value.definition}`
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
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://lahga.fyi/' },
        { '@type': 'ListItem', position: 2, name: 'الفهرس', item: 'https://lahga.fyi/browse' },
        { '@type': 'ListItem', position: 3, name: word.value.headword },
      ],
    }]
  },
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
    <p role="status" v-if="notice">{{ notice }}</p>
    <p role="alert" v-if="failure">{{ failure }}</p>

    <hgroup>
      <p><b>بالفصحى</b><template v-if="kindLabel[word.kind]"> · {{ kindLabel[word.kind] }}</template></p>
      <h1><dfn>{{ word.headword }}</dfn></h1>
      <p>{{ word.definition }}</p>
    </hgroup>
    <p>
      <small v-if="mine(word.createdBy)"><NuxtLink :to="`/w/${word.id}/edit`">تعديل الكلمة</NuxtLink> · <a href="#" @click.prevent="removeWord">حذف</a> · </small>
      <FlagButton target-type="word" :target-id="word.id" />
    </p>

    <section v-for="g in word.groups" :key="g.slug">
      <h2><NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink></h2>
      <dl>
        <div v-for="e in g.entries" :key="e.id">
          <dt>
            <b>{{ e.form }}</b>
            <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
          </dt>
          <dd>
            <template v-if="open === `entry-${e.id}`">
              <EntryForm :word-id="word.id" :entry="e" @done="done" @cancel="open = null" />
            </template>
            <template v-else>
              <p>{{ e.meaning }}</p>
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
              <p><small>
                <template v-if="e.author">أضافها <NuxtLink :to="`/u/${e.author.id}`">{{ e.author.displayName }}</NuxtLink></template>
                <template v-if="mine(e.createdBy)"> · <a href="#" @click.prevent="toggle(`entry-${e.id}`)">تعديل</a> · <a href="#" @click.prevent="remove('entries', e.id, 'المدخل')">حذف</a></template>
                <template v-if="loggedIn && user?.emailVerified"> · <a href="#" @click.prevent="toggle(`add-example-${e.id}`)">أضف مثالاً</a></template>
              </small></p>
              <ExampleForm v-if="open === `add-example-${e.id}`" :entry-id="e.id" @done="done" @cancel="open = null" />
              <div><VoteBox target-type="entry" :target-id="e.id" :score="e.score" :my-vote="e.myVote" :created-by="e.createdBy" /> <FlagButton target-type="entry" :target-id="e.id" /></div>
            </template>
          </dd>
        </div>
      </dl>
    </section>

    <p v-if="!word.groups.length">لم تُضف بعد كلمات من اللهجات لهذه الكلمة.</p>

    <section>
      <h2>كيف تُقال في لهجتك؟</h2>
      <ContributeGate>
        <EntryForm v-if="open === 'add-entry'" :word-id="word.id" @done="done" @cancel="open = null" />
        <p v-else><button type="button" @click="toggle('add-entry')">أضف شكلها في لهجتك</button></p>
      </ContributeGate>
      <p><small><NuxtLink :to="`/w/${word.id}/history`">سجل التعديلات</NuxtLink></small></p>
    </section>
  </article>
</template>
