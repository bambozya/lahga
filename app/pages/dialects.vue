<script setup lang="ts">
const { data: dialects } = await useFetch('/api/dialects')
useHead({ title: 'اللهجات - لهجة' })
</script>

<template>
  <article>
    <h1>اللهجات</h1>
    <p>اللهجات مرتبة في مجموعات كبرى تتفرع منها لهجات أدق. اختر ما تعرفه، ولو كان المجموعة فقط.</p>
    <table>
      <caption>مجموعات اللهجات وما يتفرع منها</caption>
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
          <td>{{ d.descriptionAr }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
