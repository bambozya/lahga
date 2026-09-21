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
        <!-- Icon: Material Symbols (Apache 2.0): calendar_today — the daily cadence. -->
        <dt><NuxtLink to="/daily"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" /></svg>كلمة اليوم</NuxtLink></dt>
        <dd>
          <p>كلمة واحدة بالفصحى، تُكشف لهجة بعد لهجة. خمّنها بأقل عدد من الكشوف.</p>
        </dd>
      </div>
      <div>
        <!-- Icon: Material Symbols (Apache 2.0): location_on — a form's dialect is a place. -->
        <dt><NuxtLink to="/which-dialect"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" /></svg>من أي لهجة؟</NuxtLink></dt>
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
