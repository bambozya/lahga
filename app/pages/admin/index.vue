<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useHead({ title: 'الإدارة: البلاغات - لهجة' })
const route = useRoute()
const showResolved = computed(() => route.query.status === 'resolved')
const { data: flags, refresh } = await useFetch('/api/admin/flags', { query: computed(() => ({ status: showResolved.value ? 'resolved' : 'open' })) })
const reasonLabel: Record<string, string> = { offensive: 'محتوى مسيء', wrong_dialect: 'اللهجة غير صحيحة', wrong_link: 'الربط غير صحيح', spam: 'دعاية أو تكرار', other: 'سبب آخر' }
const typeLabel: Record<string, string> = { word: 'كلمة', entry: 'مدخل', link: 'ربط', example: 'مثال' }
const statusLabel: Record<string, string> = { active: 'ظاهر', hidden: 'مخفي', deleted: 'محذوف' }
const resolutionLabel: Record<string, string> = { dismissed: 'رُفض البلاغ', hidden: 'أُخفي المحتوى', deleted: 'حُذف المحتوى' }
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
const busy = ref<number | null>(null)
const error = ref('')
const resolve = async (id: number, resolution: 'dismissed' | 'hidden' | 'deleted') => {
  const note = resolution === 'dismissed' ? '' : (prompt('ملاحظة (اختيارية):') ?? '')
  busy.value = id; error.value = ''
  try { await $fetch(`/api/admin/flags/${id}`, { method: 'POST', body: { resolution, note } }); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التنفيذ' }
  finally { busy.value = null }
}
</script>

<template>
  <article>
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>{{ showResolved ? 'البلاغات المحسومة' : 'البلاغات المفتوحة' }}</h2>
    <p><small><NuxtLink v-if="showResolved" to="/admin">عرض المفتوحة</NuxtLink><NuxtLink v-else to="/admin?status=resolved">عرض المحسومة</NuxtLink></small></p>
    <p role="alert" v-if="error">{{ error }}</p>
    <p v-if="!flags?.length">لا شيء هنا.</p>
    <dl v-else>
      <div v-for="f in flags" :key="f.id">
        <dt>
          {{ typeLabel[f.targetType] }}:
          <template v-if="f.target"><NuxtLink v-if="f.target.wordId" :to="`/w/${f.target.wordId}`">{{ f.target.text }}</NuxtLink><template v-else>{{ f.target.text }}</template> <small>({{ statusLabel[f.target.status] }})</small></template>
          <template v-else><small>عنصر غير موجود</small></template>
        </dt>
        <dd>
          <p v-if="f.target?.detail"><small>{{ f.target.detail }}</small></p>
          <p><b>{{ reasonLabel[f.reason] }}</b><template v-if="f.comment">: {{ f.comment }}</template></p>
          <p><small>أبلغ <NuxtLink v-if="f.reporter.id" :to="`/u/${f.reporter.id}`">{{ f.reporter.displayName }}</NuxtLink><template v-else>{{ f.reporter.displayName }}</template> · <time :datetime="String(f.createdAt)">{{ fmt(f.createdAt) }}</time></small></p>
          <p v-if="f.resolvedAt"><small>{{ resolutionLabel[f.resolution ?? ''] }} · {{ fmt(f.resolvedAt) }}</small></p>
          <p v-else>
            <button type="button" :disabled="busy === f.id" @click="resolve(f.id, 'dismissed')">لا مشكلة</button>
            <button type="button" :disabled="busy === f.id" @click="resolve(f.id, 'hidden')">إخفاء المحتوى</button>
            <button type="button" :disabled="busy === f.id" @click="resolve(f.id, 'deleted')">حذف المحتوى</button>
          </p>
        </dd>
      </div>
    </dl>
  </article>
</template>
