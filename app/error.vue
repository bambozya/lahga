<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error?.statusCode === 404)
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <NuxtLayout>
    <article>
      <hgroup>
        <h1>{{ error?.statusCode ?? 500 }}</h1>
        <p>{{ notFound ? 'الصفحة غير موجودة' : 'حدث خطأ' }}</p>
      </hgroup>
      <p v-if="notFound">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
      <p v-else>{{ error?.statusMessage || 'عذراً، حدث خطأ غير متوقع.' }}</p>
      <p>
        <a href="/" @click.prevent="handleError">العودة إلى الصفحة الرئيسية</a>
        أو <NuxtLink to="/">تصفح الكلمات</NuxtLink>
      </p>
    </article>
  </NuxtLayout>
</template>
