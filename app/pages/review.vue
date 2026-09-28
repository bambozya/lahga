<script setup lang="ts">
// The review list: forms a language model drafted and no speaker has confirmed
// yet (schema.wordEntryLinks.needsReview), one dialect at a time. Meant to be
// sent as a link — /review?dialect=libyan — to someone who speaks it. Staff
// only for now: ordinary readers are not shown which forms are drafts.
definePageMeta({ middleware: 'staff' })
const route = useRoute()
const dialect = computed(() => typeof route.query.dialect === 'string' ? route.query.dialect : '')
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const { data } = await useFetch('/api/review', { query: { dialect, page } })
const current = computed(() => data.value?.counts.find(c => c.slug === dialect.value))
const total = computed(() => data.value?.counts.reduce((n, c) => n + c.n, 0) ?? 0)
const pages = computed(() => current.value ? Math.ceil(current.value.n / (data.value?.pageSize ?? 200)) : 0)

useSeo({
  title: () => current.value ? `بحاجة إلى تحقق: ${current.value.nameAr}` : 'بحاجة إلى تحقق',
  description: 'أشكال لهجية لم يتحقق منها متحدّث بعد. إن كانت لهجتك، فأخبرنا إن كانت تُقال هكذا.',
  noindex: true,
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="current ? [{ label: 'بحاجة إلى تحقق', to: '/review' }, { label: current.nameAr }] : [{ label: 'بحاجة إلى تحقق' }]" />
    <h1>بحاجة إلى تحقق</h1>
    <p>
      بعض الأشكال في المعجم مسودات لم يؤكّدها متحدّث بعد. يراها المشرفون وحدهم الآن
      بنقطة مفرغة بعد الكلمة في صفحتها. افتح الكلمة وأكّدها إن كانت صحيحة، أو صحّحها
      أو احذفها إن كانت خطأ. جوابان بـ«نعم» من المشرفين يكفيان أيضاً.
    </p>

    <p v-if="!total">لا شيء ينتظر التحقق الآن.</p>
    <nav v-else aria-label="اللهجات">
      <ul class="dialects">
        <li v-for="c in data?.counts" :key="c.slug">
          <NuxtLink :to="{ query: { dialect: c.slug } }" :aria-current="c.slug === dialect ? 'page' : undefined">{{ c.nameAr }}</NuxtLink>
          <small> {{ c.n }}</small>
        </li>
      </ul>
    </nav>

    <template v-if="current">
      <h2>{{ current.nameAr }}: {{ current.n }} شكلاً</h2>
      <dl class="drafts">
        <div v-for="it in data?.items" :key="it.linkId">
          <dt><NuxtLink :to="`/w/${it.wordSlug}`">{{ it.form }}</NuxtLink></dt>
          <dd>{{ it.headword }}</dd>
        </div>
      </dl>
      <p v-if="pages > 1">
        <template v-for="p in pages" :key="p">
          <NuxtLink v-if="p !== page" :to="{ query: { dialect, page: p } }">{{ p }}</NuxtLink>
          <b v-else>{{ p }}</b>
          {{ ' ' }}
        </template>
      </p>
    </template>
  </article>
</template>

<style scoped>
.dialects {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-s);
  padding: 0;
}
.dialects small { color: var(--muted); }
.drafts > div {
  display: flex;
  gap: var(--space-s);
  align-items: baseline;
  padding-block: var(--space-3xs);
  border-block-end: var(--thin);
}
.drafts dt { font: 700 var(--step-1)/1.5 var(--naskh); min-width: 8em; }
.drafts dd { margin: 0; color: var(--muted); }
</style>
