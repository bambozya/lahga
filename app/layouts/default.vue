<script setup lang="ts">
const router = useRouter()
const route = useRoute()
// The header search is the only search box: on the home page it shows the active query.
const q = ref(String(route.query.q ?? ''))
watch(() => route.query.q, v => { q.value = String(v ?? '') })
// The form has a real action so it works without JS; with JS we stay in the app.
const search = () => router.push({ path: '/', query: q.value.trim() ? { q: q.value.trim() } : {} })
// Account link in the top bar: the person icon and the name. Logging out lives on the settings page.
const { loggedIn, user } = useUserSession()
</script>

<template>
  <div>
    <a href="#main">تخطَّ إلى المحتوى</a>

    <!-- Top bar: the account at the inline start (top right in RTL), the theme
         switch at the inline end, both on one line above the masthead. -->
    <div class="topbar">
      <nav aria-label="الحساب">
        <!-- Icon: Material Symbols (Apache 2.0): person. -->
        <NuxtLink v-if="loggedIn" to="/settings"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" /></svg>{{ user?.displayName }}</NuxtLink>
        <!-- Icon: Material Symbols (Apache 2.0): login. -->
        <NuxtLink v-else to="/login" class="login-link" aria-label="دخول"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z" /></svg></NuxtLink>
      </nav>
      <ThemeSwitch />
    </div>

    <header>
      <NuxtLink to="/" aria-label="لهجة، قاموس اللهجات العربية: الصفحة الرئيسية">
        <AppLogo />
      </NuxtLink>
      <nav aria-label="الرئيسي">
        <ul>
          <li><NuxtLink to="/">الكلمات</NuxtLink></li>
          <li><NuxtLink to="/dialects">اللهجات</NuxtLink></li>
          <li><NuxtLink to="/games">الألغاز</NuxtLink></li>
          <li><NuxtLink to="/add-word">أضف كلمة</NuxtLink></li>
          <!-- The account (and moderation under /settings/admin) lives in the top bar. -->
        </ul>
      </nav>
      <search>
        <form action="/" method="get" @submit.prevent="search">
          <label><input v-model="q" type="search" name="q" aria-label="ابحث عن كلمة بالفصحى أو بأي لهجة" placeholder="ابحث عن كلمة…" /></label>
          <button type="submit" title="بحث"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg></button>
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
        هذا الموقع يتيح الفرصة للجمهور بإضافة المزيد من المواد وتصحيح ما هو موجود.
      </p>
      <!-- rel="license" says to a crawler what the sentence says to a reader. -->
      <p>
        <small>محتوى القاموس متاح برخصة المشاع الإبداعي
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ar" rel="license noopener">CC BY-SA 4.0</a>:
        انسخه وابنِ عليه، مع نسبته إلى «لهجة» وبالرخصة نفسها.</small>
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

