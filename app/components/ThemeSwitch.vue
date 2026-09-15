<script setup lang="ts">
// Three native buttons with icons: system / light / dark. The pressed one is the
// current choice. It lives in localStorage; the inline script in nuxt.config
// applies it before the first paint so there is no flash on reload.
type Theme = 'auto' | 'light' | 'dark'
const theme = ref<Theme>('auto')

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') theme.value = saved
})

const choose = (value: Theme) => {
  theme.value = value
  const root = document.documentElement
  if (value === 'auto') {
    delete root.dataset.theme
    localStorage.removeItem('theme')
  } else {
    root.dataset.theme = value
    localStorage.setItem('theme', value)
  }
}
</script>

<template>
  <div role="group" aria-label="المظهر">
    <button type="button" title="تلقائي" aria-label="تلقائي" :aria-pressed="theme === 'auto'" @click="choose('auto')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
    </button>
    <button type="button" title="فاتح" aria-label="فاتح" :aria-pressed="theme === 'light'" @click="choose('light')">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>
    </button>
    <button type="button" title="داكن" aria-label="داكن" :aria-pressed="theme === 'dark'" @click="choose('dark')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5z" fill="currentColor" /></svg>
    </button>
  </div>
</template>

<style scoped>
/* A bar above the content; buttons keep the native look, only the icon size is set. */
div { display: flex; justify-content: flex-end; gap: var(--space-2xs); padding: var(--space-2xs) var(--space-s-m); border-block-end: var(--rule); }
button { display: inline-flex; align-items: center; }
svg { width: 1.25em; height: 1.25em; }
button[aria-pressed="true"] svg { color: var(--accent); }
</style>
