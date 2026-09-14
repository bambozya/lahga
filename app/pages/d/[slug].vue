<script setup lang="ts">
const route = useRoute()
const { data: dialect, error } = await useFetch(`/api/dialects/${route.params.slug}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'اللهجة غير موجودة', fatal: true })
useHead({ title: () => `${dialect.value?.nameAr} - لهجة` })
</script>

<template>
  <div v-if="dialect" class="dialect">
    <header class="dialect-header">
      <p v-if="dialect.parent" class="crumb">
        <NuxtLink :to="`/d/${dialect.parent.slug}`">{{ dialect.parent.nameAr }}</NuxtLink>
      </p>
      <h1 class="lemma title">{{ dialect.nameAr }}</h1>
      <p v-if="dialect.descriptionAr" class="muted">{{ dialect.descriptionAr }}</p>
      <p v-if="dialect.children.length" class="children">
        <NuxtLink v-for="c in dialect.children" :key="c.id" :to="`/d/${c.slug}`" class="pill">{{ c.nameAr }}</NuxtLink>
      </p>
    </header>

    <p v-if="!dialect.entries.length" class="muted">لا توجد كلمات بعد في هذه اللهجة.</p>
    <div v-for="e in dialect.entries" :key="e.id" class="entry">
      <div class="entry-head">
        <span class="lemma form">{{ e.form }}</span>
        <NuxtLink v-if="e.dialect.slug !== dialect.slug" :to="`/d/${e.dialect.slug}`" class="pill">{{ e.dialect.nameAr }}</NuxtLink>
        <VoteBox :score="e.score" class="entry-vote" />
      </div>
      <p class="meaning">
        <span class="form-inline">{{ e.form }}</span> تعني:
        <NuxtLink v-for="w in e.words" :key="w.id" :to="`/w/${w.id}`" class="msa">{{ w.headword }}</NuxtLink>
      </p>
      <p class="meaning-text">{{ e.meaning }}</p>
    </div>
  </div>
</template>

<style scoped>
.dialect { max-width: 720px; }
.dialect-header { margin-bottom: 2rem; }
.crumb { margin: 0; font-size: 0.9rem; }
.title { font-size: 2.8rem; margin: 0; }
.dialect-header p { margin: 0.4rem 0 0; }
.children { display: flex; flex-wrap: wrap; gap: 0.35rem; }

.entry { margin-bottom: 1.75rem; }
.entry-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.form { font-size: 1.8rem; }
.entry-vote { margin-inline-start: auto; align-self: center; }
.meaning { margin: 0.35rem 0 0; }
.form-inline { font-weight: 700; }
.msa { font-weight: 700; margin-inline-end: 0.3rem; }
.meaning-text { margin: 0; color: var(--muted); }
</style>
