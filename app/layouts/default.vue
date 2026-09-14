<script setup lang="ts">
const isMenuOpen = ref(false)
const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }
const closeMenu = () => { isMenuOpen.value = false }
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="container header-content">
        <NuxtLink to="/" class="brand" @click="closeMenu">
          <span class="site-title">لهجة</span>
          <span class="site-subtitle">قاموس اللهجات العربية</span>
        </NuxtLink>

        <button class="menu-toggle" :class="{ open: isMenuOpen }" @click="toggleMenu" aria-label="القائمة">
          <span></span><span></span><span></span>
        </button>

        <nav class="main-nav" :class="{ 'is-open': isMenuOpen }">
          <NuxtLink to="/" @click="closeMenu">الرئيسية</NuxtLink>
          <NuxtLink to="/browse" @click="closeMenu">تصفح</NuxtLink>
          <NuxtLink to="/about" @click="closeMenu">عن الموقع</NuxtLink>
        </nav>
      </div>
      <div class="sadu"></div>
    </header>

    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>

    <footer class="footer">
      <div class="sadu sadu--dark"></div>
      <div class="container footer-content">
        <p class="footer-brand">لهجة <span class="muted-on-dark">· قاموس اللهجات العربية · {{ new Date().getFullYear() }}</span></p>
        <div class="footer-links">
          <NuxtLink to="/about">عن الموقع</NuxtLink>
          <NuxtLink to="/privacy">سياسة الخصوصية</NuxtLink>
          <NuxtLink to="/terms">شروط الاستخدام</NuxtLink>
          <NuxtLink to="/contact">اتصل بنا</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container { display: flex; flex-direction: column; min-height: 100vh; }
.main-content { flex: 1; padding: 2rem 0 3rem; }

.header { background: var(--paper); position: sticky; top: 0; z-index: 100; }
.header-content { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; }

.brand { display: flex; align-items: baseline; gap: 0.75rem; color: var(--ink); }
.brand:hover { color: var(--ink); }
.site-title { font-size: 2.4rem; font-weight: 700; color: var(--green); line-height: 1; }
.brand:hover .site-title { color: var(--red); }
.site-subtitle { font-size: 0.95rem; color: var(--muted); }

.main-nav { display: flex; align-items: center; gap: 1.75rem; }
.main-nav a { color: var(--ink); font-weight: 700; font-size: 1.05rem; padding: 0.2rem 0; border-bottom: 3px solid transparent; }
.main-nav a:hover { color: var(--green); }
.main-nav a.router-link-active { border-bottom-color: var(--red); }

.menu-toggle {
  display: none; background: none; border: none; padding: 0;
  width: 30px; height: 24px; flex-direction: column; justify-content: space-between;
}
.menu-toggle span { display: block; height: 4px; width: 100%; background: var(--ink); }

.footer { background: var(--ink); color: var(--sand); }
.footer-content { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1rem; flex-wrap: wrap; gap: 1rem; }
.footer-brand { margin: 0; font-weight: 700; font-size: 1.2rem; }
.muted-on-dark { color: var(--faint); font-weight: 400; font-size: 0.9rem; }
.footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.footer-links a { color: var(--sand); font-size: 0.95rem; }
.footer-links a:hover { color: var(--ochre); }

@media (max-width: 768px) {
  .site-subtitle { display: none; }
  .menu-toggle { display: flex; }
  .main-nav {
    display: none; flex-direction: column; align-items: stretch; gap: 0;
    position: absolute; top: 100%; right: 0; left: 0;
    background: var(--paper); border-bottom: 2px solid var(--ink); padding: 0.5rem 1rem 1rem;
  }
  .main-nav.is-open { display: flex; }
  .main-nav a { padding: 0.6rem 0; border-bottom: 1px solid var(--sand-dark); }
  .main-nav a.router-link-active { border-bottom-color: var(--red); }
  .footer-content { flex-direction: column; align-items: flex-start; }
}
</style>
