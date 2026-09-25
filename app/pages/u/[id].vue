<script setup lang="ts">
const route = useRoute()
const { data: profile, error } = await useFetch(`/api/users/${route.params.id}` as `/api/users/${number}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود', fatal: true })
const { data: contributions } = await useFetch(`/api/users/${route.params.id}/contributions` as `/api/users/${number}/contributions`)
const kindLabel = { word: '', phrase: 'عبارة', proverb: 'مثل' } as const
useSeo({
  title: () => profile.value?.displayName ?? '',
  description: () => profile.value ? `صفحة ${profile.value.displayName} في لهجة: الكلمات التي أضافها إلى معجم اللهجات العربية.` : '',
})
const since = computed(() => profile.value ? new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long' }).format(new Date(profile.value.createdAt)) : '')
const roleLabel = { user: '', moderator: 'مشرف', admin: 'مدير' } as const
</script>

<template>
  <article v-if="profile">
    <BreadCrumbs :trail="[{ label: profile.displayName }]" />
    <hgroup>
      <h1>{{ profile.displayName }}</h1>
      <p v-if="roleLabel[profile.role]">{{ roleLabel[profile.role] }}</p>
    </hgroup>
    <p><small>عضو منذ <time :datetime="profile.createdAt">{{ since }}</time></small></p>
    <p v-if="profile.bio">{{ profile.bio }}</p>

    <section v-if="contributions?.words.length">
      <h2>كلمات أضافها</h2>
      <ul>
        <li v-for="w in contributions.words" :key="w.id">
          <NuxtLink :to="`/w/${w.slug}`">{{ w.headword }}</NuxtLink><small v-if="kindLabel[w.kind]"> ({{ kindLabel[w.kind] }})</small>
        </li>
      </ul>
    </section>
    <section v-if="contributions?.entries.length">
      <h2>أشكال من لهجته</h2>
      <ul>
        <li v-for="e in contributions.entries" :key="e.id">
          <b>{{ e.form }}</b> <NuxtLink :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
          <template v-if="e.word"> بمعنى <NuxtLink :to="`/w/${e.word.slug}`">{{ e.word.headword }}</NuxtLink></template>
        </li>
      </ul>
    </section>
    <p v-else-if="!contributions?.words.length"><small>لم يضف هذا العضو شيئاً بعد.</small></p>
  </article>
</template>
