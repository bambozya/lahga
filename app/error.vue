<template>
  <div class="not-found">
    <div class="not-found-container">
      <h1 class="error-code">{{ error?.statusCode ?? 500 }}</h1>
      <h2 class="error-title">{{ error?.statusCode === 404 ? "الصفحة غير موجودة" : "حدث خطأ" }}</h2>
      <p class="error-message">
        عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <div class="actions">
        <a href="/" class="home-button" @click.prevent="handleError"
          >العودة إلى الصفحة الرئيسية</a
        >
        <NuxtLink to="/browse" class="browse-button"
          >تصفح الكلمات</NuxtLink
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem 0;
}

.not-found-container {
  background-color: var(--card-background);
  border-radius: 0.5rem;
  padding: 3rem 2rem;
  box-shadow: var(--shadow);
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.error-code {
  font-size: 6rem;
  font-weight: bold;
  color: var(--primary-color);
  margin: 0;
  line-height: 1;
}

.error-title {
  font-size: 2rem;
  margin: 1rem 0;
  color: var(--text-color);
}

.error-message {
  font-size: 1.1rem;
  color: var(--light-text);
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto;
}

.home-button,
.browse-button {
  display: block;
  padding: 0.8rem 1rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
}

.home-button {
  background-color: var(--primary-color);
  color: white;
}

.home-button:hover {
  background-color: #3a5a84;
}

.browse-button {
  background-color: var(--background-color);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.browse-button:hover {
  background-color: rgba(74, 111, 165, 0.1);
}

@media (max-width: 768px) {
  .error-code {
    font-size: 4rem;
  }

  .error-title {
    font-size: 1.5rem;
  }
}
</style>

<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
const handleError = () => clearError({ redirect: '/' })
</script>
