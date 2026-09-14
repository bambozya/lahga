<script setup lang="ts">
const router = useRouter()
const q = ref('')
// The form has a real action so it works without JS; with JS we stay in the app.
const search = () => { if (q.value.trim()) router.push({ path: '/browse', query: { q: q.value.trim() } }) }
</script>

<template>
  <div>
    <a href="#main">تخطَّ إلى المحتوى</a>

    <header>
      <NuxtLink to="/">لهجة</NuxtLink>
      <search>
        <form action="/browse" method="get" @submit.prevent="search">
          <label>ابحث <input v-model="q" type="search" name="q" /></label>
          <button type="submit">بحث</button>
        </form>
      </search>
      <nav aria-label="الرئيسي">
        <ul>
          <li><NuxtLink to="/">الرئيسية</NuxtLink></li>
          <li><NuxtLink to="/dialects">اللهجات</NuxtLink></li>
          <li><NuxtLink to="/browse">الفهرس</NuxtLink></li>
          <li><NuxtLink to="/add-word">أضف كلمة</NuxtLink></li>
        </ul>
      </nav>
    </header>

    <main id="main">
      <slot />
    </main>

    <footer>
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
