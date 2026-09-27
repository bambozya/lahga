<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: العناوين', noindex: true })
const { data, refresh } = await useFetch('/api/admin/slug-suffixes')
const statusLabel: Record<string, string> = { active: 'ظاهرة', hidden: 'مخفية', deleted: 'متقاعدة' }
const busy = ref<number | null>(null)
const error = ref('')
const run = async (id: number, action: () => Promise<any>) => {
  busy.value = id; error.value = ''
  try { await action(); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التنفيذ' }
  finally { busy.value = null }
}
type Pair = NonNullable<typeof data.value>['suffixed'][number]
type Mismatch = NonNullable<typeof data.value>['mismatched'][number]
const merge = (p: Pair) => {
  if (!p.holder) return
  const what = p.holder.retiredEntries ? `وتعود ${p.holder.retiredEntries} من مدخلاتها القديمة إلى الصفحة` : 'وليس فيها مدخلات تعود'
  if (!confirm(`دمج «${p.holder.headword}» في «${p.word.headword}»؟\nتنتقل الصفحة إلى /w/${p.base}، ${what}.`)) return
  run(p.word.id, () => $fetch<any>('/api/admin/merge-words', { method: 'POST', body: { keepId: p.word.id, absorbId: p.holder!.id } }))
}
const reset = (m: Pick<Mismatch, 'id' | 'headword' | 'slug' | 'expected'>) => {
  if (!confirm(`إعادة ضبط عنوان «${m.headword}»؟\nينتقل من /w/${m.slug} إلى /w/${m.expected} (أو ما يليه إن كان مأخوذاً)، والعنوان القديم يتوقف.`)) return
  run(m.id, () => $fetch<any>('/api/admin/reset-slug', { method: 'POST', body: { wordId: m.id } }))
}
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'العناوين' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <p role="alert" v-if="error">{{ error }}</p>

    <h2>عناوين لا تطابق الكلمة</h2>
    <p><small>كلمة عُدّل رأسها بعد إنشائها، فبقي عنوانها على الرأس القديم؛ العنوان يُضبط مرة واحدة عند الإنشاء كي لا تنكسر الروابط المنشورة. إعادة الضبط تنقل الصفحة إلى عنوان يطابق الرأس الحالي، والعنوان القديم يتوقف عن العمل.</small></p>
    <p v-if="!data?.mismatched.length">لا شيء هنا.</p>
    <table v-else class="slugs">
      <thead>
        <tr>
          <th>الكلمة</th>
          <th>العنوان الآن</th>
          <th>العنوان المطابق</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in data.mismatched" :key="m.id">
          <td><NuxtLink :to="`/w/${m.slug}`">{{ m.headword }}</NuxtLink> <small>({{ m.entries }} مدخل)</small></td>
          <td class="slug"><code>/w/{{ m.slug }}</code></td>
          <td class="slug"><code>/w/{{ m.expected }}</code></td>
          <td class="actions"><button type="button" :disabled="busy === m.id" @click="reset(m)">إعادة ضبط</button></td>
        </tr>
      </tbody>
    </table>

    <h2>كلمات بعناوين مرقّمة</h2>
    <p><small>كلمة ظاهرة عنوانها ينتهي برقم، مثل ‎/w/أين-2، لأن كلمة أخرى، متقاعدة غالباً، ما زالت تحمل العنوان الأصلي. الدمج ينقل الصفحة إلى العنوان الأصلي، ويعيد إليها ما كان على الكلمة القديمة من مدخلات وأمثلة إن كانت لهجاتها غير ممثلة، ويطوي الكلمة القديمة.</small></p>
    <p v-if="!data?.suffixed.length">لا شيء هنا.</p>
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
        <tr v-for="p in data.suffixed" :key="p.word.id">
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
            <!-- Nobody holds the plain address any more (its holder was reset away): just move there. -->
            <button v-else type="button" :disabled="busy === p.word.id" @click="reset({ id: p.word.id, headword: p.word.headword, slug: p.word.slug!, expected: p.base })">إعادة ضبط</button>
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
  width: 7em;
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
