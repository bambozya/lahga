<script setup lang="ts">
const route = useRoute()
const { data: dialect, error } = await useFetch(`/api/dialects/${route.params.slug}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'اللهجة غير موجودة', fatal: true })
useHead({ title: () => `${dialect.value?.nameAr} - لهجة` })
</script>

<template>
  <div v-if="dialect">
    <header class="dialect-header">
      <p v-if="dialect.parent" class="crumb">
        <NuxtLink :to="`/d/${dialect.parent.slug}`">{{ dialect.parent.nameAr }}</NuxtLink>
      </p>
      <h1 class="page-title">{{ dialect.nameAr }}</h1>
      <p v-if="dialect.descriptionAr" class="muted">{{ dialect.descriptionAr }}</p>
      <p v-if="dialect.children.length" class="children">
        <NuxtLink v-for="c in dialect.children" :key="c.id" :to="`/d/${c.slug}`" class="dialect-tag">{{ c.nameAr }}</NuxtLink>
      </p>
    </header>

    <p v-if="!dialect.entries.length" class="muted">لا توجد كلمات بعد في هذه اللهجة.</p>
    <div v-else class="entries">
      <div v-for="e in dialect.entries" :key="e.id" class="card entry">
        <div class="entry-head">
          <span class="form">{{ e.form }}</span>
          <span v-if="e.dialect.slug !== dialect.slug" class="dialect-tag">{{ e.dialect.nameAr }}</span>
          <VoteBox :score="e.score" class="entry-vote" />
        </div>
        <p class="meaning">{{ e.meaning }}</p>
        <p class="msa">
          <span class="msa-label">بالفصحى</span>
          <NuxtLink v-for="w in e.words" :key="w.id" :to="`/w/${w.id}`" class="msa-link">{{ w.headword }}</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialect-header { border-bottom: 4px solid var(--ink); padding-bottom: 1rem; margin-bottom: 1.5rem; }
.dialect-header .page-title { margin-bottom: 0; font-size: 3rem; }
.crumb { margin: 0; font-weight: 700; }
.children { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.6rem 0 0; }

.entries { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.entry { border-inline-start-width: 8px; border-inline-start-color: var(--green); }
.entry-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem; }
.form { font-size: 2rem; font-weight: 700; line-height: 1.2; }
.entry-vote { margin-inline-start: auto; }
.meaning { margin-bottom: 0.5rem; }
.msa { margin: 0; display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.msa-label { color: var(--red); font-weight: 700; font-size: 0.85rem; }
.msa-link { font-weight: 700; font-size: 1.1rem; }
</style>
