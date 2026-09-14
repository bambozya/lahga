<script setup lang="ts">
const route = useRoute()
const { data: word, error } = await useFetch(`/api/words/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
useHead({ title: () => `${word.value?.headword} - لهجة` })
</script>

<template>
  <article v-if="word">
    <header class="word-header card">
      <h1 class="headword">{{ word.headword }}</h1>
      <p class="msa-label">بالفصحى</p>
      <p class="definition">{{ word.definition }}</p>
    </header>

    <section v-for="g in word.groups" :key="g.slug" class="group">
      <h2 class="group-title">
        <NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink>
      </h2>
      <div class="entries">
        <div v-for="e in g.entries" :key="e.id" class="card entry">
          <div class="entry-head">
            <span class="form">{{ e.form }}</span>
            <NuxtLink v-if="e.dialect.slug !== g.slug" :to="`/d/${e.dialect.slug}`" class="dialect-tag">{{ e.dialect.nameAr }}</NuxtLink>
            <span class="score">{{ e.score >= 0 ? '+' : '' }}{{ e.score }}</span>
          </div>
          <p class="meaning">{{ e.meaning }}</p>
          <p v-if="e.notes" class="muted">{{ e.notes }}</p>
          <ul v-if="e.examples.length" class="examples">
            <li v-for="x in e.examples" :key="x.id">
              <span class="example-text">{{ x.text }}</span>
              <span v-if="x.gloss" class="muted"> — {{ x.gloss }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p v-if="!word.groups.length" class="muted">لم تُضف بعد كلمات من اللهجات لهذه الكلمة.</p>
  </article>
</template>

<style scoped>
.word-header { text-align: center; margin-bottom: 2rem; }
.headword { font-size: 3rem; color: var(--primary-color); margin-bottom: 0; }
.msa-label { color: var(--lighter-text); font-size: 0.85rem; margin-bottom: 0.5rem; }
.definition { font-size: 1.2rem; margin: 0; }
.group { margin-bottom: 2rem; }
.group-title { font-size: 1.4rem; margin-bottom: 0.75rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.25rem; }
.entries { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.entry-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.form { font-size: 1.5rem; font-weight: 700; }
.entry-head .score { margin-inline-start: auto; }
.meaning { margin-bottom: 0.5rem; }
.examples { list-style: none; padding: 0; margin: 0.5rem 0 0; border-inline-start: 3px solid var(--accent-color); padding-inline-start: 0.75rem; }
.example-text { font-style: italic; }
</style>
