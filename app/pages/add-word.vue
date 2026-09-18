<script setup lang="ts">
useHead({ title: 'أضف كلمة - لهجة' })
const { loggedIn, user } = useUserSession()
</script>

<template>
  <article>
    <h1>أضف كلمة</h1>
    <p v-if="!loggedIn">إضافة الكلمات تحتاج إلى حساب. <NuxtLink to="/register">أنشئ حساباً</NuxtLink> أو <NuxtLink to="/login">سجّل الدخول</NuxtLink>.</p>
    <p v-else-if="!user?.emailVerified">أكّد بريدك الإلكتروني أولاً؛ تجد رابط التأكيد في بريدك أو في <NuxtLink to="/settings">الإعدادات</NuxtLink>.</p>
    <p v-else>حسابك جاهز. نموذج الإضافة نفسه يُفتح في المرحلة القادمة.</p>
    <p>كل كلمة تُضاف تُربط بمعناها بالفصحى، ثم يُضاف لها الشكل الذي تُقال به في لهجتك مع مثال أو أكثر. هكذا تظهر الكلمة نفسها بجانب مرادفاتها في اللهجات الأخرى.</p>
    <p>إلى حين ذلك، يمكنك <NuxtLink to="/contact">مراسلتنا</NuxtLink> بالكلمات التي تود إضافتها.</p>
  </article>
</template>
