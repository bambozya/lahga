<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: الأرقام', noindex: true })
const { data: stats } = await useFetch('/api/admin/stats')
const n = (v: number | undefined) => new Intl.NumberFormat('ar').format(v ?? 0)
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'الأرقام' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>الأرقام</h2>
    <p><small>ما هو ظاهر على الموقع الآن. «الصيغ» هي المدخلات اللهجية المربوطة بكلمة؛ الصيغة الواحدة قد تُربط بأكثر من كلمة فصحى، فلذلك تزيد الصيغ على السجلات. «مرادفات» هي الصيغ الزائدة عن الأولى في اللهجة الواحدة للكلمة الواحدة.</small></p>

    <dl v-if="stats" class="totals">
      <div><dt>كلمات فصحى</dt><dd>{{ n(stats.words) }} <small>({{ n(stats.kinds.word) }} كلمة، {{ n(stats.kinds.phrase) }} عبارة، {{ n(stats.kinds.proverb) }} مثل)</small></dd></div>
      <div><dt>صيغ لهجية</dt><dd>{{ n(stats.forms) }} <small>({{ n(stats.entryRows) }} سجلاً)</small></dd></div>
      <div><dt>كلمات لها مرادف في لهجة واحدة</dt><dd>{{ n(stats.wordsWithSynonyms) }}</dd></div>
      <div><dt>أمثلة</dt><dd>{{ n(stats.examples) }}</dd></div>
    </dl>

    <table v-if="stats" class="dialects">
      <thead>
        <tr><th>اللهجة</th><th>الصيغ</th><th>الكلمات</th><th>مرادفات</th></tr>
      </thead>
      <tbody v-for="g in stats.regions" :key="g.slug">
        <tr class="region">
          <th scope="rowgroup"><NuxtLink :to="`/d/${g.slug}`">{{ g.nameAr }}</NuxtLink></th>
          <td>{{ n(g.forms) }}</td>
          <td>{{ n(g.own.words) }}</td>
          <td>{{ n(g.own.forms - g.own.words) }}</td>
        </tr>
        <tr v-for="c in g.children" :key="c.slug" class="child">
          <th scope="row"><NuxtLink :to="`/d/${c.slug}`">{{ c.nameAr }}</NuxtLink></th>
          <td>{{ n(c.forms) }}</td>
          <td>{{ n(c.words) }}</td>
          <td>{{ n(c.forms - c.words) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="stats"><small>صف المنطقة يجمع صيغها وصيغ فروعها؛ أما «الكلمات» و«مرادفات» فيه فتخص ما وُسم بالمنطقة نفسها فقط، لأن كلمةً تُقال في المصري والقاهري معاً لا تُحسب مرتين.</small></p>
  </article>
</template>

<style scoped>
.totals dd {
  font-variant-numeric: tabular-nums;
}
.dialects td {
  font-variant-numeric: tabular-nums;
  width: 6em;
}
.dialects .child th {
  padding-inline-start: var(--space-m);
  font-weight: normal;
}
</style>
