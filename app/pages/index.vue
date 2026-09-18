<script setup lang="ts">
useSeo({
  title: 'قاموس اللهجات العربية',
  path: '/',
  description: 'قاموس تشاركي للهجات العربية: كيف تُقال الكلمة نفسها في مصر والشام والخليج والعراق واليمن والمغرب والسودان. أحدث الكلمات المضافة، ومعانيها، وأمثلة على استعمالها.',
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'لهجة',
    alternateName: 'لهجة، قاموس اللهجات العربية',
    url: 'https://lahga.fyi/',
    inLanguage: 'ar',
    description: 'قاموس تشاركي يربط كلمات اللهجات العربية بمعانيها بالفصحى.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://lahga.fyi/browse?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  }],
})
const { data: entries } = await useFetch('/api/entries', { query: { limit: 20 } })
const { data: dialects } = await useFetch('/api/dialects')
</script>

<template>
  <div>
    <section>
      <h1>أحدث الكلمات</h1>
      <dl v-if="entries?.length">
        <EntryCard v-for="e in entries" :key="e.id" :entry="e" />
      </dl>
      <p v-else>لا توجد كلمات بعد.</p>
    </section>

    <aside>
      <h2>اللهجات</h2>
      <details v-for="d in dialects" :key="d.id" name="dialects">
        <summary>{{ d.nameAr }}</summary>
        <ul>
          <li><NuxtLink :to="`/d/${d.slug}`">كل كلمات {{ d.nameAr }}</NuxtLink></li>
          <li v-for="c in d.children" :key="c.id"><NuxtLink :to="`/d/${c.slug}`">{{ c.nameAr }}</NuxtLink></li>
        </ul>
      </details>
    </aside>
  </div>
</template>
