<script setup lang="ts">
const route = useRoute()
const { user } = useUserSession()
const { data, error, refresh } = await useFetch(`/api/words/${route.params.id}/history` as `/api/words/${number}/history`)
const busy = ref<number | null>(null)
const failure = ref('')
const revert = async (id: number) => {
  if (!confirm('إرجاع هذا الإصدار؟ يُسجَّل كإصدار جديد.')) return
  busy.value = id; failure.value = ''
  try { await $fetch(`/api/admin/revisions/${id}/revert`, { method: 'POST' }); await refresh() }
  catch (e: any) { failure.value = e?.data?.statusMessage || 'تعذر الاسترجاع' }
  finally { busy.value = null }
}
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة', fatal: true })
useSeo({ title: () => `سجل التعديلات: ${data.value?.word.headword ?? ''}`, noindex: true })
const typeLabel = { word: 'الكلمة', entry: 'مدخل', link: 'ربط', example: 'مثال' } as const
const fieldLabel: Record<string, string> = { headword: 'الكلمة', definition: 'التعريف', kind: 'النوع', dialect: 'اللهجة', form: 'الشكل', meaning: 'المعنى', notes: 'ملاحظات', text: 'المثال', gloss: 'الشرح', status: 'الحالة' }
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))

// Three of the stored fields are English by nature — a dialect's slug, and the
// two enums — and a revision is exactly where a contributor comes to check
// what changed, so they cannot stay English here the way they might in a URL.
const { data: dialects } = await useFetch('/api/dialects', { query: { all: 1 } })
const dialectName = computed(() => {
  const map: Record<string, string> = {}
  for (const g of dialects.value ?? []) {
    map[g.slug] = g.nameAr
    for (const c of g.children) map[c.slug] = c.nameAr
  }
  return map
})
const kindLabel: Record<string, string> = { word: 'كلمة', phrase: 'عبارة', proverb: 'مثل شعبي' }
const statusLabel: Record<string, string> = { active: 'ظاهر', hidden: 'مخفي', deleted: 'محذوف' }
/** A revision field's stored value, translated where the field is one of the three English-by-nature ones above. */
const displayValue = (key: string, val: unknown) => {
  if (val === null || val === '') return val
  if (key === 'dialect') return dialectName.value[String(val)] ?? val
  if (key === 'kind') return kindLabel[String(val)] ?? val
  if (key === 'status') return statusLabel[String(val)] ?? val
  return val
}
</script>

<template>
  <article v-if="data">
    <BreadCrumbs :trail="[{ label: data.word.headword, to: `/w/${data.word.id}` }, { label: 'سجل التعديلات' }]" />
    <h1>سجل التعديلات: <NuxtLink :to="`/w/${data.word.id}`">{{ data.word.headword }}</NuxtLink></h1>
    <p>كل إضافة أو تعديل يُحفظ هنا. الإصدار الأول لكل عنصر هو إضافته.</p>
    <p role="alert" v-if="failure">{{ failure }}</p>
    <ol>
      <li v-for="r in data.revisions" :key="r.id">
        <p>
          <b>{{ typeLabel[r.targetType] }} #{{ r.targetId }}</b>، الإصدار {{ r.revisionNo }}
          · <NuxtLink v-if="r.author.id" :to="`/u/${r.author.id}`">{{ r.author.displayName }}</NuxtLink><template v-else>{{ r.author.displayName }}</template>
          · <time :datetime="String(r.createdAt)">{{ fmt(r.createdAt) }}</time>
        </p>
        <p v-if="r.reason"><small>السبب: {{ r.reason }}</small></p>
        <p v-if="user?.role === 'admin' && r.targetType !== 'link' && r.data.status !== 'deleted'"><small><button type="button" :disabled="busy === r.id" @click="revert(r.id)">إرجاع هذا الإصدار</button></small></p>
        <dl>
          <template v-for="(val, key) in r.data" :key="key">
            <div v-if="val !== null && val !== '' && fieldLabel[String(key)]">
              <dt><small>{{ fieldLabel[String(key)] }}</small></dt>
              <dd>{{ displayValue(String(key), val) }}</dd>
            </div>
          </template>
        </dl>
      </li>
    </ol>
  </article>
</template>
