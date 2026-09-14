<script setup lang="ts">
const isMenuOpen = ref(false)
const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }
const closeMenu = () => { isMenuOpen.value = false }
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="container header-content">
        <div class="logo-container">
          <NuxtLink to="/" @click="closeMenu">
            <h1 class="site-title">لهجة</h1>
            <span class="site-subtitle">قاموس اللهجات العربية</span>
          </NuxtLink>
        </div>

        <button class="menu-toggle" @click="toggleMenu" aria-label="القائمة">
          <span></span><span></span><span></span>
        </button>

        <nav class="main-nav" :class="{ 'is-open': isMenuOpen }">
          <NuxtLink to="/" @click="closeMenu">الرئيسية</NuxtLink>
          <NuxtLink to="/browse" @click="closeMenu">تصفح</NuxtLink>
          <NuxtLink to="/about" @click="closeMenu">عن الموقع</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>

    <footer class="footer">
      <div class="container">
        <p>© {{ new Date().getFullYear() }} لهجة - قاموس اللهجات العربية</p>
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
.main-content { flex: 1; padding: 2rem 0; }

.header {
  background-color: var(--card-background);
  box-shadow: var(--shadow);
  position: sticky; top: 0; z-index: 100;
}
.header-content { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; }
.logo-container { display: flex; align-items: center; }
.logo-container a { display: flex; align-items: baseline; gap: 0.5rem; }
.site-title { font-size: 2rem; color: var(--primary-color); margin: 0; }
.site-subtitle { font-size: 0.9rem; color: var(--light-text); }

.main-nav { display: flex; align-items: center; gap: 1.5rem; }
.main-nav a { color: var(--text-color); font-weight: 500; }
.main-nav a:hover, .main-nav a.router-link-active { color: var(--primary-color); }

.menu-toggle {
  display: none; background: none; border: none;
  width: 30px; height: 25px; flex-direction: column; justify-content: space-between;
}
.menu-toggle span { display: block; height: 3px; width: 100%; background-color: var(--text-color); border-radius: 3px; }

.footer {
  background-color: var(--card-background);
  border-top: 1px solid var(--border-color);
  padding: 2rem 0; margin-top: 2rem;
}
.footer .container { display: flex; justify-content: space-between; align-items: center; }
.footer-links { display: flex; gap: 1.5rem; }
.footer-links a { color: var(--light-text); font-size: 0.9rem; }
.footer-links a:hover { color: var(--primary-color); }

@media (max-width: 768px) {
  .header-content { flex-wrap: wrap; }
  .menu-toggle { display: flex; }
  .main-nav {
    display: none; flex-direction: column; align-items: flex-start; gap: 0;
    position: absolute; top: 100%; right: 0; left: 0;
    background-color: var(--card-background); box-shadow: var(--shadow); padding: 1rem;
  }
  .main-nav.is-open { display: flex; }
  .main-nav a { margin: 0.5rem 0; width: 100%; }
  .footer .container { flex-direction: column; gap: 1rem; }
  .footer-links { flex-wrap: wrap; }
}
</style>
