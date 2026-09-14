<script setup lang="ts">
const route = useRoute()
const { data: word, error } = await useFetch(`/api/words/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
useHead({ title: () => `${word.value?.headword} - لهجة` })
</script>

<template>
  <article v-if="word" class="word">
    <header class="word-header">
      <p class="msa-label">بالفصحى</p>
      <h1 class="headword">{{ word.headword }}</h1>
      <p class="definition">{{ word.definition }}</p>
    </header>

    <section v-for="g in word.groups" :key="g.slug" class="group">
      <h2 class="group-title">
        <NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink>
      </h2>
      <div v-for="e in g.entries" :key="e.id" class="card entry">
        <div class="entry-main">
          <div class="entry-head">
            <span class="form">{{ e.form }}</span>
            <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" class="dialect-tag">{{ e.dialect.nameAr }}</NuxtLink>
          </div>
          <p class="meaning">{{ e.meaning }}</p>
          <p v-if="e.notes" class="muted notes">{{ e.notes }}</p>
          <ul v-if="e.examples.length" class="examples">
            <li v-for="x in e.examples" :key="x.id">
              <span class="example">{{ x.text }}</span>
              <span v-if="x.gloss" class="gloss">{{ x.gloss }}</span>
            </li>
          </ul>
        </div>
        <VoteBox :score="e.score" class="entry-vote" />
      </div>
    </section>

    <p v-if="!word.groups.length" class="muted">لم تُضف بعد كلمات من اللهجات لهذه الكلمة.</p>
  </article>
</template>

<style scoped>
.word { max-width: 820px; }
.word-header { border-bottom: 4px solid var(--ink); padding-bottom: 1rem; margin-bottom: 2rem; }
.msa-label { color: var(--red); font-weight: 700; font-size: 0.9rem; margin: 0; }
.headword { font-size: 3.8rem; font-weight: 700; color: var(--ink); margin: 0; line-height: 1.15; }
.definition { font-size: 1.3rem; margin: 0.25rem 0 0; color: var(--muted); }

.group { margin-bottom: 2.25rem; }
.group-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.6rem; }
.group-title a { color: var(--green); }
.group-title a:hover { color: var(--red); }

.entry {
  display: flex; gap: 1.25rem; align-items: flex-start;
  border-inline-start-width: 8px; border-inline-start-color: var(--green);
  margin-bottom: 0.75rem;
}
.entry-main { flex: 1; min-width: 0; }
.entry-vote { flex-shrink: 0; margin-top: 0.5rem; }
.entry-head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.form { font-size: 2.2rem; font-weight: 700; line-height: 1.2; }
.meaning { margin: 0.2rem 0 0; font-size: 1.1rem; }
.notes { margin: 0.2rem 0 0; }
.examples { list-style: none; padding: 0; margin: 0.6rem 0 0; }
.examples li { display: flex; flex-direction: column; }
.example { font-size: 1.6rem; }
.gloss { color: var(--muted); font-size: 0.9rem; }

@media (max-width: 600px) {
  .entry { flex-direction: column; gap: 0.5rem; }
  .headword { font-size: 3rem; }
}
</style>
