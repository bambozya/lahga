<script setup lang="ts">
// The games hub: one nav entry for both, so the header does not grow a new
// top-level link every time another one is added.
useSeo({
  title: 'ألعاب',
  description: 'ألعاب يومية من قاموس لهجة: خمّن الكلمة بالفصحى من أشكالها في اللهجات، أو خمّن اللهجة من شكل الكلمة.',
  path: '/games',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'ألعاب' }]" />
    <hgroup class="head">
      <h1>ألعاب</h1>
      <p>لعبة جديدة كل يوم، بلا حساب. النتيجة تُشارك، الإجابة لا تُكشف قبل انتهاء الجولة.</p>
    </hgroup>

    <dl>
      <div>
        <dt><NuxtLink to="/daily">كلمة اليوم</NuxtLink></dt>
        <dd>
          <p>كلمة واحدة بالفصحى، تُكشف لهجة بعد لهجة. خمّنها بأقل عدد من الكشوف.</p>
        </dd>
      </div>
      <div>
        <dt><NuxtLink to="/which-dialect">من أي لهجة؟</NuxtLink></dt>
        <dd>
          <p>ثلاث جولات كل يوم: كلمة كما تُقال في لهجة ما، وأربعة خيارات — أيّ لهجة تكون؟</p>
        </dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.head > h1 { font-size: var(--step-3); }
.head > p { margin-block-start: var(--space-2xs); color: var(--muted); font-size: var(--step--1); max-width: var(--measure); }
</style>
