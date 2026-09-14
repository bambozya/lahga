<script setup lang="ts">
const { data: dialects } = await useFetch('/api/dialects')
useHead({ title: 'اللهجات - لهجة' })
</script>

<template>
  <div>
    <h1 class="page-title">اللهجات</h1>
    <p class="muted mb-3">اللهجات مرتبة في مجموعات كبرى تتفرع منها لهجات أدق. اختر ما تعرفه، ولو كان المجموعة فقط.</p>
    <div class="groups">
      <section v-for="d in dialects" :key="d.id" class="group">
        <h2><NuxtLink :to="`/d/${d.slug}`" class="lemma group-name">{{ d.nameAr }}</NuxtLink></h2>
        <p v-if="d.descriptionAr" class="muted">{{ d.descriptionAr }}</p>
        <p v-if="d.children.length" class="children">
          <NuxtLink v-for="c in d.children" :key="c.id" :to="`/d/${c.slug}`" class="pill">{{ c.nameAr }}</NuxtLink>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-m) var(--space-l); }
.group-name { font-size: var(--step-2); }
.group p { margin-top: var(--space-3xs); }
.children { display: flex; flex-wrap: wrap; gap: var(--space-3xs); }
</style>
