<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: آخر الإضافات', noindex: true })
const { data: items, refresh } = await useFetch('/api/admin/recent')
const typeLabel: Record<string, string> = { word: 'كلمة', entry: 'مدخل', example: 'مثال' }
const statusLabel: Record<string, string> = { active: 'ظاهر', hidden: 'مخفي', deleted: 'محذوف' }
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'آخر الإضافات' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>آخر الإضافات</h2>
    <p v-if="!items?.length">لا شيء بعد.</p>
    <dl v-else>
      <div v-for="i in items" :key="`${i.type}-${i.id}`">
        <dt>
          <small>{{ typeLabel[i.type] }}</small>
          <NuxtLink v-if="i.wordId" :to="`/w/${i.wordId}`">{{ i.text }}</NuxtLink><template v-else>{{ i.text }}</template>
          <small v-if="i.status !== 'active'">({{ statusLabel[i.status] }})</small>
        </dt>
        <dd>
          <p v-if="i.detail"><small>{{ i.detail }}</small></p>
          <p><small><NuxtLink v-if="i.author.id" :to="`/u/${i.author.id}`">{{ i.author.displayName }}</NuxtLink><template v-else>{{ i.author.displayName }}</template> · <time :datetime="String(i.createdAt)">{{ fmt(i.createdAt) }}</time></small></p>
          <p><ContentStatusButtons :type="i.type" :id="i.id" :status="i.status" @changed="refresh" /></p>
        </dd>
      </div>
    </dl>
  </article>
</template>
