<script setup lang="ts">
const route = useRoute()
const { data: dialect, error } = await useFetch(`/api/dialects/${route.params.slug}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'اللهجة غير موجودة', fatal: true })
useHead({ title: () => `${dialect.value?.nameAr} - لهجة` })
</script>

<template>
  <div v-if="dialect">
    <p v-if="dialect.parent" class="muted mb-1">
      <NuxtLink :to="`/d/${dialect.parent.slug}`">{{ dialect.parent.nameAr }}</NuxtLink> ‹
    </p>
    <h1 class="page-title">{{ dialect.nameAr }}</h1>
    <p v-if="dialect.descriptionAr" class="muted mb-2">{{ dialect.descriptionAr }}</p>
    <p v-if="dialect.children.length" class="mb-3">
      <NuxtLink v-for="c in dialect.children" :key="c.id" :to="`/d/${c.slug}`" class="dialect-tag child">{{ c.nameAr }}</NuxtLink>
    </p>

    <p v-if="!dialect.entries.length" class="muted">لا توجد كلمات بعد في هذه اللهجة.</p>
    <div v-else class="entries">
      <div v-for="e in dialect.entries" :key="e.id" class="card entry">
        <div class="entry-head">
          <span class="form">{{ e.form }}</span>
          <span v-if="e.dialect.slug !== dialect.slug" class="dialect-tag">{{ e.dialect.nameAr }}</span>
          <span class="score">{{ e.score >= 0 ? '+' : '' }}{{ e.score }}</span>
        </div>
        <p class="meaning">{{ e.meaning }}</p>
        <p class="muted msa">
          بالفصحى:
          <NuxtLink v-for="w in e.words" :key="w.id" :to="`/w/${w.id}`" class="msa-link">{{ w.headword }}</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.child { margin-inline-end: 0.4rem; }
.entries { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.entry-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.form { font-size: 1.5rem; font-weight: 700; }
.entry-head .score { margin-inline-start: auto; }
.meaning { margin-bottom: 0.5rem; }
.msa-link { margin-inline-start: 0.3rem; font-weight: 500; }
</style>
