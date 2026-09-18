<script setup lang="ts">
const { data: dialects } = await useFetch('/api/dialects')
useHead({ title: 'اللهجات - لهجة' })
// Only the first paragraph fits a table cell; the dialect page has the rest.
const summary = (t: string | null | undefined) => (t ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
</script>

<template>
  <article>
    <h1>اللهجات</h1>
    <p>اللهجات مرتبة في مجموعات كبرى تتفرع منها لهجات أدق. اختر ما تعرفه، ولو كان المجموعة فقط.</p>
    <div role="region" aria-labelledby="dialects-caption" tabindex="0">
    <table>
      <caption id="dialects-caption">مجموعات اللهجات وما يتفرع منها</caption>
      <thead>
        <tr>
          <th scope="col">المجموعة</th>
          <th scope="col">اللهجات الفرعية</th>
          <th scope="col">الوصف</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in dialects" :key="d.id">
          <th scope="row"><NuxtLink :to="`/d/${d.slug}`">{{ d.nameAr }}</NuxtLink></th>
          <td>
            <template v-for="c in d.children" :key="c.id">
              <NuxtLink :to="`/d/${c.slug}`" rel="tag">{{ c.nameAr }}</NuxtLink>{{ ' ' }}
            </template>
          </td>
          <td>{{ summary(d.descriptionAr) }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </article>
</template>
