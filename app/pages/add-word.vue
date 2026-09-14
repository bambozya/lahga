<script setup lang="ts">
useHead({ title: 'أضف كلمة - لهجة' })
</script>

<template>
  <div class="add">
    <h1 class="page-title">أضف كلمة</h1>
    <p>إضافة الكلمات تحتاج إلى حساب، وسيُفتح التسجيل قريباً.</p>
    <p>كل كلمة تُضاف تُربط بمعناها بالفصحى، ثم يُضاف لها الشكل الذي تُقال به في لهجتك مع مثال أو أكثر. هكذا تظهر الكلمة نفسها بجانب مرادفاتها في اللهجات الأخرى.</p>
    <p>إلى حين ذلك، يمكنك <NuxtLink to="/contact">مراسلتنا</NuxtLink> بالكلمات التي تود إضافتها.</p>
  </div>
</template>

<style scoped>
.add { max-width: 640px; }
</style>
