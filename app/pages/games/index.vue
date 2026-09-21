<script setup lang="ts">
// The games hub: one nav entry for both, so the header does not grow a new
// top-level link every time another one is added.
useSeo({
  title: 'الألغاز',
  description: 'الألغاز اليومية من قاموس لهجة: خمّن الكلمة بالفصحى من أشكالها في اللهجات، أو خمّن اللهجة من شكل الكلمة.',
  path: '/games',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الألغاز' }]" />
    <hgroup class="head">
      <h1>الألغاز</h1>
      <p>لعبة جديدة كل يوم، بلا حساب. النتيجة تُشارك، الإجابة لا تُكشف قبل انتهاء الجولة.</p>
    </hgroup>

    <dl>
      <div>
        <!-- Icon: Material Symbols (Apache 2.0): quiz — a guess, not a date on a calendar. -->
        <dt><NuxtLink to="/daily"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M560-360q17 0 29.5-12.5T602-402q0-17-12.5-29.5T560-444q-17 0-29.5 12.5T518-402q0 17 12.5 29.5T560-360Zm-30-128h60q0-29 6-42.5t28-35.5q30-30 40-48.5t10-43.5q0-45-31.5-73.5T560-760q-41 0-71.5 23T446-676l54 22q9-25 24.5-37.5T560-704q24 0 39 13.5t15 36.5q0 14-8 26.5T578-596q-33 29-40.5 45.5T530-488ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z" /></svg>كلمة اليوم</NuxtLink></dt>
        <dd>
          <p>كلمة واحدة بالفصحى، تُكشف لهجة بعد لهجة. خمّنها بأقل عدد من الكشوف.</p>
        </dd>
      </div>
      <div>
        <!-- Icon: Material Symbols (Apache 2.0): extension — a puzzle piece, matching الألغاز. -->
        <dt><NuxtLink to="/which-dialect"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M352-120H200q-33 0-56.5-23.5T120-200v-152q48 0 84-30.5t36-77.5q0-47-36-77.5T120-568v-152q0-33 23.5-56.5T200-800h160q0-42 29-71t71-29q42 0 71 29t29 71h160q33 0 56.5 23.5T800-720v160q42 0 71 29t29 71q0 42-29 71t-71 29v160q0 33-23.5 56.5T720-120H568q0-50-31.5-85T460-240q-45 0-76.5 35T352-120Zm-152-80h85q24-66 77-93t98-27q45 0 98 27t77 93h85v-240h80q8 0 14-6t6-14q0-8-6-14t-14-6h-80v-240H480v-80q0-8-6-14t-14-6q-8 0-14 6t-6 14v80H200v88q54 20 87 67t33 105q0 57-33 104t-87 68v88Zm260-260Z" /></svg>من أي لهجة؟</NuxtLink></dt>
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

dt a { display: inline-flex; align-items: center; gap: var(--space-3xs); }
dt svg { width: 0.9em; height: 0.9em; flex: none; color: var(--accent); }
</style>
