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
useHead({ title: () => `سجل التعديلات: ${data.value?.word.headword} - لهجة` })
const typeLabel = { word: 'الكلمة', entry: 'مدخل', link: 'ربط', example: 'مثال' } as const
const fieldLabel: Record<string, string> = { headword: 'الكلمة', definition: 'التعريف', kind: 'النوع', dialect: 'اللهجة', form: 'الشكل', meaning: 'المعنى', notes: 'ملاحظات', text: 'المثال', gloss: 'الشرح', status: 'الحالة' }
const fmt = (d: string | Date) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
</script>

<template>
  <article v-if="data">
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
              <dd>{{ val === 'deleted' ? 'محذوف' : val }}</dd>
            </div>
          </template>
        </dl>
      </li>
    </ol>
  </article>
</template>
