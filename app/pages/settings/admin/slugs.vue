<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: عناوين مرقّمة', noindex: true })
const { data: pairs, refresh } = await useFetch('/api/admin/slug-suffixes')
const statusLabel: Record<string, string> = { active: 'ظاهرة', hidden: 'مخفية', deleted: 'متقاعدة' }
const busy = ref<number | null>(null)
const error = ref('')
const merge = async (p: NonNullable<typeof pairs.value>[number]) => {
  if (!p.holder) return
  const what = p.holder.retiredEntries ? `وتعود ${p.holder.retiredEntries} من مدخلاتها القديمة إلى الصفحة` : 'وليس فيها مدخلات تعود'
  if (!confirm(`دمج «${p.holder.headword}» في «${p.word.headword}»؟\nتنتقل الصفحة إلى /w/${p.base}، ${what}.`)) return
  busy.value = p.word.id; error.value = ''
  try { await $fetch('/api/admin/merge-words', { method: 'POST', body: { keepId: p.word.id, absorbId: p.holder.id } }); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر الدمج' }
  finally { busy.value = null }
}
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'عناوين مرقّمة' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>كلمات بعناوين مرقّمة</h2>
    <p><small>كلمة ظاهرة عنوانها ينتهي برقم، مثل ‎/w/أين-2، لأن كلمة أخرى، متقاعدة غالباً، ما زالت تحمل العنوان الأصلي. الدمج ينقل الصفحة إلى العنوان الأصلي، ويعيد إليها ما كان على الكلمة القديمة من مدخلات وأمثلة إن كانت لهجاتها غير ممثلة، ويطوي الكلمة القديمة.</small></p>
    <p role="alert" v-if="error">{{ error }}</p>
    <p v-if="!pairs?.length">لا شيء هنا.</p>
    <table v-else class="slugs">
      <thead>
        <tr>
          <th>الكلمة</th>
          <th>العنوان الآن</th>
          <th>من يحمل العنوان الأصلي</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pairs" :key="p.word.id">
          <td><NuxtLink :to="`/w/${p.word.slug}`">{{ p.word.headword }}</NuxtLink> <small>({{ p.word.entries }} مدخل)</small></td>
          <td class="slug"><code>/w/{{ p.word.slug }}</code></td>
          <td>
            <template v-if="p.holder">
              <NuxtLink v-if="p.holder.status === 'active'" :to="`/w/${p.holder.slug}`">{{ p.holder.headword }}</NuxtLink>
              <template v-else>{{ p.holder.headword }}</template>
              <small> · {{ statusLabel[p.holder.status] }} · {{ p.holder.entries }} مدخل ظاهر، {{ p.holder.retiredEntries }} متقاعد<template v-if="!p.holder.sameHeadword"> · كلمة مختلفة</template></small>
            </template>
            <small v-else>لا أحد</small>
          </td>
          <td class="actions">
            <button v-if="p.holder" type="button" :disabled="busy === p.word.id" @click="merge(p)">دمج</button>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.slugs {
  table-layout: fixed;
}
.slugs td {
  overflow-wrap: anywhere;
}
.slugs th:last-child {
  width: 5em;
}
.slug code {
  direction: ltr;
  unicode-bidi: isolate;
}
.actions {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}
</style>
