<script setup lang="ts">
// Three icon buttons: system / light / dark. The pressed one is the
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
  <!-- Icons: Material Symbols (Apache 2.0): contrast, light_mode, dark_mode. -->
  <div class="switch" role="group" aria-label="المظهر">
    <button type="button" title="تلقائي" aria-label="تلقائي" :aria-pressed="theme === 'auto'" @click="choose('auto')">
      <svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm40-83q119-15 199.5-104.5T800-480q0-123-80.5-212.5T520-797v634Z" /></svg>
    </button>
    <button type="button" title="فاتح" aria-label="فاتح" :aria-pressed="theme === 'light'" @click="choose('light')">
      <svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" /></svg>
    </button>
    <button type="button" title="داكن" aria-label="داكن" :aria-pressed="theme === 'dark'" @click="choose('dark')">
      <svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" /></svg>
    </button>
  </div>
</template>

<style scoped>
/* One segmented control: the three buttons share their borders. */
div { display: flex; }
button { border-radius: 0; margin-inline-start: -2px; }
button:first-child { margin-inline-start: 0; border-start-start-radius: var(--radius); border-end-start-radius: var(--radius); }
button:last-child { border-start-end-radius: var(--radius); border-end-end-radius: var(--radius); }
button:focus-visible { position: relative; z-index: 1; }
</style>
