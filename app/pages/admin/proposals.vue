<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: الاقتراحات', noindex: true })
const route = useRoute()
const status = computed(() => (['approved', 'rejected'].includes(String(route.query.status)) ? String(route.query.status) : 'pending'))
const { data: proposals, refresh } = await useFetch('/api/admin/proposals', { query: computed(() => ({ status: status.value })) })
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
const busy = ref<number | null>(null)
const error = ref('')
const decide = async (id: number, decision: 'approved' | 'rejected') => {
  const note = prompt(decision === 'approved' ? 'كلمة للمقترح (اختيارية):' : 'سبب الرفض (يظهر للمقترح):') ?? ''
  busy.value = id; error.value = ''
  try { await $fetch(`/api/admin/proposals/${id}`, { method: 'POST', body: { status: decision, note } }); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التنفيذ' }
  finally { busy.value = null }
}
</script>

<template>
  <article>
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>الاقتراحات: {{ { pending: 'قيد المراجعة', approved: 'المقبولة', rejected: 'المرفوضة' }[status] }}</h2>
    <p><small><NuxtLink to="/admin/proposals">قيد المراجعة</NuxtLink> · <NuxtLink to="/admin/proposals?status=approved">المقبولة</NuxtLink> · <NuxtLink to="/admin/proposals?status=rejected">المرفوضة</NuxtLink></small></p>
    <p role="alert" v-if="error">{{ error }}</p>
    <p v-if="!proposals?.length">لا شيء هنا.</p>
    <dl v-else>
      <div v-for="p in proposals" :key="p.id">
        <dt>
          <template v-if="p.kind === 'dialect_description'">وصف جديد لـ<NuxtLink v-if="p.dialect" :to="`/d/${p.dialect.slug}`">{{ p.dialect.nameAr }}</NuxtLink></template>
          <template v-else>لهجة جديدة: {{ p.data.nameAr }}</template>
        </dt>
        <dd>
          <template v-if="p.kind === 'dialect_description'">
            <p v-if="p.dialect?.descriptionAr"><small>الحالي: {{ p.dialect.descriptionAr }}</small></p>
            <p><b>المقترح:</b> {{ p.data.descriptionAr }}</p>
          </template>
          <p v-else><small>{{ p.data }}</small></p>
          <p><small>اقترح <NuxtLink v-if="p.author.id" :to="`/u/${p.author.id}`">{{ p.author.displayName }}</NuxtLink><template v-else>{{ p.author.displayName }}</template> · <time :datetime="String(p.createdAt)">{{ fmt(p.createdAt) }}</time></small></p>
          <p v-if="p.status !== 'pending'"><small>{{ p.status === 'approved' ? 'قُبل' : 'رُفض' }}<template v-if="p.decider"> بواسطة {{ p.decider.displayName }}</template><template v-if="p.decidedAt"> · {{ fmt(p.decidedAt) }}</template><template v-if="p.note"> · {{ p.note }}</template></small></p>
          <p v-else>
            <button type="button" :disabled="busy === p.id" @click="decide(p.id, 'approved')">قبول</button>
            <button type="button" :disabled="busy === p.id" @click="decide(p.id, 'rejected')">رفض</button>
          </p>
        </dd>
      </div>
    </dl>
  </article>
</template>
