<script setup lang="ts">
// A native <select> over the dialect tree: each region is an <optgroup> holding
// itself ("عام", for when the contributor only knows the region) and its sub-dialects.
//
// ?all=1: the browsing pages hide a sub-dialect with no words in it, but this
// list must keep it — it is the only way the first word ever gets filed under
// بغدادي, and that first word is what puts it back on the map.
const model = defineModel<string>({ default: '' })
defineProps<{ id?: string }>()
const { data: dialects } = await useFetch('/api/dialects', { query: { all: 1 } })
</script>

<template>
  <select :id="id" v-model="model" required>
    <option value="" disabled>اختر اللهجة…</option>
    <optgroup v-for="g in dialects" :key="g.slug" :label="g.nameAr">
      <option :value="g.slug">{{ g.nameAr }} (عام)</option>
      <option v-for="c in g.children" :key="c.slug" :value="c.slug">{{ c.nameAr }}</option>
    </optgroup>
  </select>
</template>
