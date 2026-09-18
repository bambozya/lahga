<script setup lang="ts">
const route = useRoute()
const { data: dialect, error } = await useFetch(`/api/dialects/${route.params.slug}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'اللهجة غير موجودة', fatal: true })
useHead({ title: () => `${dialect.value?.nameAr} - لهجة` })
</script>

<template>
  <article v-if="dialect">
    <hgroup>
      <p v-if="dialect.parent">ضمن <NuxtLink :to="`/d/${dialect.parent.slug}`">{{ dialect.parent.nameAr }}</NuxtLink></p>
      <h1>{{ dialect.nameAr }}</h1>
      <p v-if="dialect.descriptionAr">{{ dialect.descriptionAr }}</p>
    </hgroup>
    <p v-if="dialect.children.length">
      تتفرع إلى:
      <template v-for="c in dialect.children" :key="c.id">
        <NuxtLink :to="`/d/${c.slug}`" rel="tag">{{ c.nameAr }}</NuxtLink>{{ ' ' }}
      </template>
    </p>

    <dl v-if="dialect.entries.length">
      <div v-for="e in dialect.entries" :key="e.id">
        <dt>
          <b>{{ e.form }}</b>
          <NuxtLink v-if="e.dialect.slug !== dialect.slug" :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
        </dt>
        <dd>
          <p v-if="e.words.length">
            بالفصحى:
            <template v-for="(w, i) in e.words" :key="w.id">
              <template v-if="i">، </template><NuxtLink :to="`/w/${w.id}`">{{ w.headword }}</NuxtLink>
            </template>
          </p>
          <p>{{ e.meaning }}</p>
          <div><VoteBox target-type="entry" :target-id="e.id" :score="e.score" :my-vote="e.myVote" :created-by="e.createdBy" /></div>
        </dd>
      </div>
    </dl>
    <p v-else>لا توجد كلمات بعد في هذه اللهجة.</p>
  </article>
</template>
