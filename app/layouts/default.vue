<script setup lang="ts">
const router = useRouter()
const q = ref('')
const search = () => { if (q.value.trim()) router.push({ path: '/browse', query: { q: q.value.trim() } }) }
</script>

<template>
  <div class="page">
    <header class="masthead">
      <div class="container masthead-inner">
        <NuxtLink to="/" class="logo">لهجة</NuxtLink>
        <form class="search-form masthead-search" @submit.prevent="search">
          <button type="submit" class="search-button" aria-label="بحث">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
          </button>
          <input v-model="q" type="search" class="search-input" placeholder="ابحث…" />
        </form>
        <p class="tagline">القاموس الإلكتروني<br>للهجات العربية العامية</p>
      </div>
    </header>
    <div class="sadu"></div>

    <nav class="mainnav">
      <div class="container mainnav-inner">
        <NuxtLink to="/">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3z"/></svg>
          الرئيسية
        </NuxtLink>
        <NuxtLink to="/dialects">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2h-7l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
          اللهجات
        </NuxtLink>
        <NuxtLink to="/browse">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h7a2 2 0 012 2v13a1 1 0 01-1-1H3zm18 0h-7a2 2 0 00-2 2v13a1 1 0 001-1h8z"/></svg>
          الفهرس
        </NuxtLink>
        <NuxtLink to="/add-word">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 110 20 10 10 0 010-20zm-1.5 5v3.5H7v3h3.5V17h3v-3.5H17v-3h-3.5V7z"/></svg>
          أضف كلمة
        </NuxtLink>
      </div>
    </nav>

    <main class="main">
      <div class="container">
        <slot />
      </div>
    </main>

    <footer class="footer">
      <div class="stripes">
        <div class="sadu"></div>
      </div>
      <div class="container footer-inner">
        <p class="footer-text">
          لهجة هو قاموس إلكتروني للمصطلحات اليومية المستخدمة في اللهجات العربية المختلفة في أنحاء الوطن العربي.
          هذه الصفحة تتيح الفرصة للجمهور بإضافة المزيد من المواد والتصويت على ما هو موجود.
        </p>
        <div class="footer-links">
          <NuxtLink to="/about">عن الموقع</NuxtLink>
          <NuxtLink to="/privacy">سياسة الخصوصية</NuxtLink>
          <NuxtLink to="/terms">شروط الاستخدام</NuxtLink>
          <NuxtLink to="/contact">اتصل بنا</NuxtLink>
          <span class="muted">© {{ new Date().getFullYear() }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; min-height: 100vh; max-width: 1040px; margin: 0 auto; background: var(--paper); }

/* Red masthead: logo, search, tagline */
.masthead { background: var(--red); color: var(--cream); }
.masthead-inner { display: flex; align-items: center; gap: 2rem; padding: 0.75rem 1.25rem; }
.logo { font-family: var(--font-display); font-size: 4.2rem; line-height: 1; color: var(--cream); padding-bottom: 0.15em; }
.logo:hover { color: #fff; }
.masthead-search { flex: 1; max-width: 300px; }
.tagline { margin: 0; margin-inline-start: auto; text-align: start; font-size: 1.05rem; line-height: 1.5; color: var(--cream); }

/* Nav with icons */
.mainnav { background: var(--paper); border-bottom: 1px solid var(--line); }
.mainnav-inner { display: flex; justify-content: space-around; gap: 1rem; padding: 0.45rem 1.25rem; flex-wrap: wrap; }
.mainnav a { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--red); font-family: var(--font-display); font-size: 1.25rem; }
.mainnav a svg { width: 22px; height: 22px; }
.mainnav a:hover, .mainnav a.router-link-active { color: var(--ink); }

.main { flex: 1; background: var(--paper); padding: 1.75rem 0 3rem; }

/* Footer: black/red stripes framing the sadu band, then text */
.footer { background: var(--paper); }
.stripes { background: var(--ink); padding: 8px 0; border-top: 6px solid var(--red); border-bottom: 6px solid var(--red); }
.stripes .sadu { border-color: var(--cream); }
.footer-inner { padding: 1.25rem 1.25rem 1.75rem; }
.footer-text { font-family: var(--font-display); font-size: 1.05rem; color: var(--ink); margin: 0 0 0.75rem; }
.footer-links { display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: 0.9rem; }

@media (max-width: 700px) {
  .masthead-inner { flex-wrap: wrap; gap: 0.75rem 1.25rem; }
  .logo { font-size: 3.2rem; }
  .tagline { display: none; }
  .masthead-search { flex-basis: 100%; max-width: none; }
  .mainnav a { font-size: 1.05rem; }
}
</style>
