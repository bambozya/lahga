<script setup lang="ts">
// A native <select> over the dialect tree: each region is an <optgroup> holding
// itself ("عام", for when the contributor only knows the region) and its sub-dialects.
const model = defineModel<string>({ default: '' })
defineProps<{ id?: string }>()
const { data: dialects } = await useFetch('/api/dialects')
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
