<script setup lang="ts">
const router = useRouter()
const route = useRoute()
// The header search is the only search box: on the index page it shows the active query.
const q = ref(String(route.query.q ?? ''))
watch(() => route.query.q, v => { q.value = String(v ?? '') })
// The form has a real action so it works without JS; with JS we stay in the app.
const search = () => router.push({ path: '/browse', query: q.value.trim() ? { q: q.value.trim() } : {} })
// Account links in the nav.
const { loggedIn, user, clear } = useUserSession()
const logout = async () => { await clear(); await router.push('/') }
</script>

<template>
  <div>
    <a href="#main">تخطَّ إلى المحتوى</a>

    <ThemeSwitch />

    <header>
      <NuxtLink to="/" aria-label="لهجة، قاموس اللهجات العربية: الصفحة الرئيسية">
        <AppLogo />
      </NuxtLink>
      <nav aria-label="الرئيسي">
        <ul>
          <li><NuxtLink to="/">الرئيسية</NuxtLink></li>
          <li><NuxtLink to="/dialects">اللهجات</NuxtLink></li>
          <li><NuxtLink to="/browse">الفهرس</NuxtLink></li>
          <li><NuxtLink to="/add-word">أضف كلمة</NuxtLink></li>
          <li v-if="loggedIn && user?.role === 'admin'"><NuxtLink to="/admin">الإدارة</NuxtLink></li>
          <li v-if="loggedIn"><NuxtLink to="/settings">{{ user?.displayName }}</NuxtLink></li>
          <li v-if="loggedIn"><a href="/api/auth/logout" @click.prevent="logout">خروج</a></li>
          <li v-else><NuxtLink to="/login">دخول</NuxtLink></li>
        </ul>
      </nav>
      <search>
        <form action="/browse" method="get" @submit.prevent="search">
          <label><input v-model="q" type="search" name="q" aria-label="ابحث عن كلمة بالفصحى أو بأي لهجة" placeholder="ابحث عن كلمة…" /></label>
          <button type="submit"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg> بحث</button>
        </form>
      </search>
    </header>

    <main id="main">
      <slot />
    </main>

    <footer>
      <AppLogo />
      <p>
        لهجة هو قاموس إلكتروني للمصطلحات اليومية المستخدمة في اللهجات العربية المختلفة في أنحاء الوطن العربي.
        هذه الصفحة تتيح الفرصة للجمهور بإضافة المزيد من المواد والتصويت على ما هو موجود.
      </p>
      <nav aria-label="عن الموقع">
        <ul>
          <li><NuxtLink to="/about">عن الموقع</NuxtLink></li>
          <li><NuxtLink to="/privacy">سياسة الخصوصية</NuxtLink></li>
          <li><NuxtLink to="/terms">شروط الاستخدام</NuxtLink></li>
          <li><NuxtLink to="/contact">اتصل بنا</NuxtLink></li>
        </ul>
      </nav>
      <p><small>© {{ new Date().getFullYear() }} لهجة</small></p>
    </footer>
  </div>
</template>

