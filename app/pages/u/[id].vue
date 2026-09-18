<script setup lang="ts">
const route = useRoute()
const { data: profile, error } = await useFetch(`/api/users/${route.params.id}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود', fatal: true })
useHead({ title: () => `${profile.value?.displayName ?? ''} - لهجة` })
const since = computed(() => profile.value ? new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long' }).format(new Date(profile.value.createdAt)) : '')
const roleLabel = { user: '', moderator: 'مشرف', admin: 'مدير' } as const
</script>

<template>
  <article v-if="profile">
    <hgroup>
      <h1>{{ profile.displayName }}</h1>
      <p v-if="roleLabel[profile.role]">{{ roleLabel[profile.role] }}</p>
    </hgroup>
    <p><small>عضو منذ <time :datetime="profile.createdAt">{{ since }}</time></small></p>
    <p v-if="profile.bio">{{ profile.bio }}</p>
    <p><small>مساهمات هذا العضو ستظهر هنا عندما تُفتح الإضافة.</small></p>
  </article>
</template>
