<script setup lang="ts">
const route = useRoute()
const { data: word, error } = await useFetch(`/api/words/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
useHead({ title: () => `${word.value?.headword} - لهجة` })
</script>

<template>
  <article v-if="word" class="word">
    <header class="word-header">
      <p class="row-label">بالفصحى</p>
      <h1 class="lemma headword">{{ word.headword }}</h1>
      <p class="definition">{{ word.definition }}</p>
    </header>

    <section v-for="g in word.groups" :key="g.slug" class="group">
      <h2 class="section-title">
        <NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink>
      </h2>
      <div v-for="e in g.entries" :key="e.id" class="entry">
        <div class="entry-head">
          <span class="lemma form">{{ e.form }}</span>
          <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" class="pill">{{ e.dialect.nameAr }}</NuxtLink>
          <VoteBox :score="e.score" class="entry-vote" />
        </div>
        <p class="meaning">{{ e.meaning }}</p>
        <p v-if="e.notes" class="muted">{{ e.notes }}</p>
        <ul v-if="e.examples.length" class="examples">
          <li v-for="x in e.examples" :key="x.id">
            <span class="example">{{ x.text }}</span>
            <span v-if="x.gloss" class="gloss">{{ x.gloss }}</span>
          </li>
        </ul>
      </div>
    </section>

    <p v-if="!word.groups.length" class="muted">لم تُضف بعد كلمات من اللهجات لهذه الكلمة.</p>
  </article>
</template>

<style scoped>
.word { max-width: var(--measure); }
.word-header { margin-bottom: var(--space-l); }
.word-header .row-label { color: var(--red); font-weight: 700; }
.headword { font-size: var(--step-5); }
.definition { font-size: var(--step-1); margin-top: var(--space-2xs); color: var(--muted); }

.group { margin-bottom: var(--space-l); }
.section-title a { color: var(--ink); }
.section-title a:hover { color: var(--red); }

.entry { margin-bottom: var(--space-m); }
.entry-head { display: flex; align-items: baseline; gap: var(--space-2xs); flex-wrap: wrap; }
.form { font-size: var(--step-3); }
.entry-vote { margin-inline-start: auto; align-self: center; }
.meaning { margin-top: var(--space-3xs); }
.examples { list-style: none; padding: 0; margin: var(--space-3xs) 0 0; }
.examples li { display: flex; flex-direction: column; }
.gloss { color: var(--muted); font-size: var(--step--1); }
</style>
