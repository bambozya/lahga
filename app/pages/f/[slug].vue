<script setup lang="ts">
/**
 * A dialect form's own page (server/utils/forms.ts): «what does دلوقتي mean?»,
 * the question a word page answers only the other way round.
 */
const route = useRoute()
// Decoded once, as on the word page: SSR can hand the param over still encoded.
const param = decodeURIComponent(String(route.params.slug))
const { data: page, error } = await useFetch(`/api/forms/${encodeURIComponent(param)}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
// Another spelling of the same form (هلّق for هلق, a trailing «؟») lands on the one page.
if (page.value && page.value.slug !== param) {
  await navigateTo(`/f/${page.value.slug}`, { redirectCode: 301 })
}

const dialects = computed(() => namesOf(page.value?.senses ?? []))
const heads = computed(() => page.value?.senses.map(s => s.word.headword) ?? [])
// With two meanings or more, each names who means it (whoSays, app/utils/forms.ts).
const multi = computed(() => (page.value?.senses.length ?? 0) > 1)
const lang = computed(() => dialectTag(page.value?.senses[0]?.entries[0]?.dialect.slug))
const draftTitle = 'لم يتحقق منها متحدّث بعد'

useSeo({
  // «معنى X» first: it is the whole of what people type.
  title: () => page.value ? `معنى ${page.value.form} بالفصحى: ${heads.value.slice(0, 3).join('، ')}` : '',
  description: () => {
    const p = page.value
    if (!p) return ''
    const first = p.senses[0]!
    // Several meanings: they are the description. The other dialects' forms
    // belong to one meaning each, and would read as belonging to all of them.
    if (multi.value) return `«${p.form}» معناها بالفصحى ${p.senses.map(s => `«${s.word.headword}» (${whoSays(s)})`).join(' و')}.`
    const meaning = `«${p.form}» (${dialects.value.join('، ')}) معناها بالفصحى «${first.word.headword}»`
      + (first.word.definition ? `: ${first.word.definition.replace(/[.。]$/, '')}.` : '.')
    const others = first.others.slice(0, 5).map(o => `${o.form} (${o.dialects[0]})`).join('، ')
    return others ? `${meaning} وفي اللهجات الأخرى: ${others}.` : meaning
  },
  noindex: () => !page.value?.indexable,
  jsonLd: () => {
    const p = page.value
    if (!p) return undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: p.form,
      description: heads.value.join('، '),
      inLanguage: lang.value,
      url: `https://lahga.fyi/f/${p.slug}`,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'لهجة، معجم اللهجات العربية', url: 'https://lahga.fyi', license: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    }
  },
  image: () => page.value ? `/og/w/${page.value.senses[0]!.word.id}.png` : undefined,
  path: () => page.value ? `/f/${page.value.slug}` : undefined,
})
</script>

<template>
  <article v-if="page">
    <BreadCrumbs :trail="[{ label: page.form }]" />

    <!-- The form is the page; what it means in MSA is the answer, right under it. -->
    <hgroup class="pivot">
      <p><b>بالعامية</b> · {{ dialects.join('، ') }}</p>
      <h1><dfn :lang="lang">{{ page.form }}</dfn></h1>
      <p class="definition">
        معناها بالفصحى:
        <template v-for="(s, i) in page.senses" :key="s.word.id">
          <template v-if="i"> · </template><NuxtLink :to="`/w/${s.word.slug}`"><b>{{ s.word.headword }}</b></NuxtLink><small v-if="multi"> ({{ whoSays(s) }})</small>
        </template>
      </p>
    </hgroup>

    <section v-for="s in page.senses" :key="s.word.id">
      <h2>بمعنى <NuxtLink :to="`/w/${s.word.slug}`">{{ s.word.headword }}</NuxtLink></h2>
      <p v-if="s.word.definition">{{ s.word.definition }}</p>
      <dl>
        <div v-for="e in s.entries" :key="e.id">
          <dt :data-draft="e.draft || undefined" :title="e.draft ? draftTitle : undefined">
            <b :lang="dialectTag(e.dialect.slug)">{{ e.form }}</b>
            <NuxtLink :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
          </dt>
          <dd v-if="e.meaning || e.notes || e.examples.length">
            <p v-if="e.meaning">{{ e.meaning }}</p>
            <p v-if="e.notes"><small>{{ e.notes }}</small></p>
            <ul v-if="e.examples.length">
              <li v-for="x in e.examples" :key="x.id">
                <q :lang="dialectTag(e.dialect.slug)">{{ x.text }}</q>
                <small v-if="x.gloss"> {{ x.gloss }}</small>
              </li>
            </ul>
          </dd>
        </div>
      </dl>
      <!-- The same meaning elsewhere: the one thing only this dictionary can say. -->
      <p v-if="s.others.length" class="glance">
        <span>وفي لهجات أخرى:</span>
        <template v-for="(o, i) in s.others" :key="o.form">
          <template v-if="i">، </template><span :data-draft="o.draft || undefined" :title="o.draft ? draftTitle : undefined"><NuxtLink :to="formPath(o.form)"><b>{{ o.form }}</b></NuxtLink> <small>{{ o.dialects.join('، ') }}</small></span>
        </template>
      </p>
    </section>

    <section v-if="page.phrases.length">
      <h2>عبارات فيها «{{ page.form }}»</h2>
      <ul class="phrases">
        <li v-for="p in page.phrases" :key="p.form">
          <span :data-draft="p.draft || undefined" :title="p.draft ? draftTitle : undefined"><NuxtLink :to="formPath(p.form)"><b>{{ p.form }}</b></NuxtLink></span>&nbsp;
          <small>{{ p.dialects.join('، ') }}</small>
          · <NuxtLink :to="`/w/${p.wordSlug}`">{{ p.headword }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section class="contribute">
      <h2>كيف تُقال في لهجتك؟</h2>
      <p>
        <template v-for="(s, i) in page.senses" :key="s.word.id">
          <template v-if="i"> · </template><NuxtLink :to="`/w/${s.word.slug}`">أضف شكل «{{ s.word.headword }}» في لهجتك</NuxtLink>
        </template>
      </p>
    </section>
  </article>
</template>

<style scoped>
/* Set like the word page: the form is the headline, the rest is evidence. */
.pivot { border-block-end: var(--thin); padding-block-end: var(--space-s); }
.pivot > h1 { font-size: var(--step-5); line-height: 1.2; margin-block-start: var(--space-3xs); }
.pivot > .definition { font-size: var(--step-1); margin-block-start: var(--space-2xs); }

section > h2 { font: 700 var(--step-0)/1.6 var(--naskh); color: var(--muted); }
section > h2 a { text-decoration-color: var(--hair); }
.contribute > h2 { font: 700 var(--step-2)/1.45 var(--naskh); color: var(--ink); }

section + section { border-block-start: var(--thin); padding-block-start: var(--space-m); }
section + section:last-child { border-block-start: var(--rule); }
dl > div { border-block-start: 0; padding-block: 0; }
dl > div + div { margin-block-start: var(--space-s); }
dt { font: 700 var(--step-1)/1.5 var(--naskh); }
.glance { margin-block-start: var(--space-s); }
.phrases { list-style: none; padding: 0; }
</style>
