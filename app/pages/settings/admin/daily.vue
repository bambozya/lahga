<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeo({ title: 'الإدارة: لهجة اليومية', noindex: true })
const { data, refresh } = await useFetch('/api/admin/daily')

const date = ref('')
const headword = ref('')
const { busy, error, run } = useForm(async () => {
  await $fetch('/api/admin/daily', { method: 'POST', body: { date: date.value, headword: headword.value } })
  date.value = ''
  headword.value = ''
  await refresh()
})

const upcoming = computed(() => data.value ? data.value.puzzles.filter(p => p.date > data.value!.today) : [])
const past = computed(() => data.value ? data.value.puzzles.filter(p => p.date <= data.value!.today) : [])
const fmt = (d: string) => new Intl.DateTimeFormat('ar', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00Z`))
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'الإعدادات', to: '/settings' }, { label: 'الإدارة', to: '/settings/admin' }, { label: 'لهجة اليومية' }]" />
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>لهجة اليومية</h2>
    <p><small>
      كل يوم قادم بلا كلمة مُحدَّدة يُملأ تلقائياً، عند وصوله، بأكثر كلمة مختلف عليها لم تُستعمل بعد. حدِّد كلمة هنا
      فقط لتستبدل ذلك الاختيار التلقائي ليوم قادم — لا يمكن تغيير كلمة اليوم أو الأيام السابقة.
    </small></p>

    <form class="picker" @submit.prevent="run">
      <fieldset :disabled="busy">
        <legend>حدِّد كلمة ليوم قادم</legend>
        <p role="alert" v-if="error">{{ error }}</p>
        <p class="row">
          <label for="date">التاريخ</label>
          <input id="date" v-model="date" type="date" :min="data?.today" required />
          <label for="headword">الكلمة بالفصحى</label>
          <input id="headword" v-model="headword" required maxlength="80" />
          <button type="submit">حدِّد</button>
        </p>
      </fieldset>
    </form>

    <h3>الأيام القادمة</h3>
    <p v-if="!upcoming.length">لا كلمة مُحدَّدة مسبقاً؛ كل يوم قادم سيُملأ تلقائياً عند وصوله.</p>
    <table v-else>
      <thead><tr><th>اليوم</th><th>الكلمة</th></tr></thead>
      <tbody>
        <tr v-for="p in upcoming" :key="p.date">
          <td>{{ fmt(p.date) }}</td>
          <td><NuxtLink :to="`/w/${p.word.slug}`">{{ p.word.headword }}</NuxtLink></td>
        </tr>
      </tbody>
    </table>

    <h3>السجل</h3>
    <p v-if="!past.length">لا شيء بعد.</p>
    <table v-else>
      <thead><tr><th>اليوم</th><th>الكلمة</th></tr></thead>
      <tbody>
        <tr v-for="p in past" :key="p.date">
          <td><NuxtLink v-if="p.date < data!.today" :to="`/daily/${p.date}`">{{ fmt(p.date) }}</NuxtLink><template v-else>{{ fmt(p.date) }} (اليوم)</template></td>
          <td><NuxtLink :to="`/w/${p.word.slug}`">{{ p.word.headword }}</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.picker .row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2xs) var(--space-s); }
.picker input[type="date"] { width: auto; }
.picker input:not([type]), .picker input[type="text"] { flex: 1; min-width: 10em; }
h3 { margin-block-start: var(--space-l); }
</style>
