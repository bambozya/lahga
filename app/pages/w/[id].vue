<script setup lang="ts">
const route = useRoute()
// The literal type narrows the URL to the [id] route; a plain template string would also match /api/words/all.
const { data: word, error } = await useFetch(`/api/words/${route.params.id}` as `/api/words/${number}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
useHead({ title: () => `${word.value?.headword} - لهجة` })
</script>

<template>
  <article v-if="word">
    <hgroup>
      <p><b>بالفصحى</b></p>
      <h1><dfn>{{ word.headword }}</dfn></h1>
      <p>{{ word.definition }}</p>
    </hgroup>

    <section v-for="g in word.groups" :key="g.slug">
      <h2><NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink></h2>
      <dl>
        <div v-for="e in g.entries" :key="e.id">
          <dt>
            <b>{{ e.form }}</b>
            <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
          </dt>
          <dd>
            <p>{{ e.meaning }}</p>
            <p v-if="e.notes"><small>{{ e.notes }}</small></p>
            <ul v-if="e.examples.length">
              <li v-for="x in e.examples" :key="x.id">
                <q>{{ x.text }}</q>
                <small v-if="x.gloss"> {{ x.gloss }}</small>
              </li>
            </ul>
            <div><VoteBox :score="e.score" /></div>
          </dd>
        </div>
      </dl>
    </section>

    <p v-if="!word.groups.length">لم تُضف بعد كلمات من اللهجات لهذه الكلمة.</p>
  </article>
</template>
