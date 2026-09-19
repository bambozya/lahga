<script setup lang="ts">
const route = useRoute()
// Five of the dialect's words, drawn at random: the page is a way in, not an
// inventory, and whoever wants one word in particular searches for it above.
// The dice below ask for another five.
const SAMPLE = 5
const { data: dialect, error, status, refresh } = await useFetch(`/api/dialects/${route.params.slug}`, {
  query: { random: 1, limit: SAMPLE },
})
const shuffling = computed(() => status.value === 'pending')
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'اللهجة غير موجودة', fatal: true })
// The description is written in paragraphs separated by blank lines; the first one is the summary.
const paragraphs = computed(() => (dialect.value?.descriptionAr ?? '').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean))
useSeo({
  // The dialect name stays a label, so the title reads correctly for every name.
  title: () => dialect.value ? `${dialect.value.nameAr}: قاموس كلمات اللهجة` : '',
  description: () => {
    if (!dialect.value) return ''
    // The shown words change with every draw; the description quotes the
    // dialect's best-known forms instead, so it stays the same page to page.
    const words = dialect.value.topForms.join('، ')
    return words ? `${paragraphs.value[0] ?? ''} من كلماتها: ${words}.` : (paragraphs.value[0] ?? '')
  },
  jsonLd: () => dialect.value ? {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: `كلمات اللهجة: ${dialect.value.nameAr}`,
    description: paragraphs.value[0],
    url: `https://lahga.fyi/d/${dialect.value.slug}`,
    inLanguage: 'ar',
  } : undefined,
})
const proposing = ref(false)
const proposed = ref(false)
const description = ref('')
const proposal = useForm(async () => {
  await $fetch('/api/proposals', { method: 'POST', body: { dialect: route.params.slug, descriptionAr: description.value } })
  proposed.value = true
  proposing.value = false
})
</script>

<template>
  <article v-if="dialect">
    <hgroup>
      <p v-if="dialect.parent">ضمن <NuxtLink :to="`/d/${dialect.parent.slug}`">{{ dialect.parent.nameAr }}</NuxtLink></p>
      <h1>{{ dialect.nameAr }}</h1>
      <p v-if="paragraphs[0]">{{ paragraphs[0] }}</p>
      <p v-else><small>لا وصف بعد.</small></p>
    </hgroup>
    <section v-if="paragraphs.length > 1">
      <p v-for="(t, i) in paragraphs.slice(1)" :key="i">{{ t }}</p>
    </section>
    <p><small>
      <template v-if="dialect.descriptionBy">الوصف من <NuxtLink v-if="dialect.descriptionBy.id" :to="`/u/${dialect.descriptionBy.id}`">{{ dialect.descriptionBy.displayName }}</NuxtLink><template v-else>{{ dialect.descriptionBy.displayName }}</template> · </template>
      <span v-if="proposed" role="status">شكراً، وصل اقتراحك وسينظر فيه المديرون.</span>
      <a v-else href="#" @click.prevent="proposing = !proposing; description = description || dialect.descriptionAr || ''">اقترح وصفاً أفضل</a>
    </small></p>
    <ContributeGate v-if="proposing">
      <form @submit.prevent="proposal.run">
        <fieldset :disabled="proposal.busy.value">
          <legend>اقتراح وصف لـ{{ dialect.nameAr }}</legend>
          <p role="alert" v-if="proposal.error.value">{{ proposal.error.value }}</p>
          <p>
            <label for="description">الوصف المقترح</label>
            <textarea id="description" v-model="description" required minlength="20" maxlength="3000" rows="8"></textarea>
            <small>أين تُتكلم، وما أبرز ملامحها، وما يميزها عن جاراتها. يراجعه مدير قبل نشره.</small>
          </p>
          <p><button type="submit">أرسل الاقتراح</button> <button type="button" @click="proposing = false">إلغاء</button></p>
        </fieldset>
      </form>
    </ContributeGate>
    <p v-if="dialect.children.length">
      تتفرع إلى:
      <template v-for="c in dialect.children" :key="c.id">
        <NuxtLink :to="`/d/${c.slug}`" rel="tag">{{ c.nameAr }}</NuxtLink>{{ ' ' }}
      </template>
    </p>

    <h2 v-if="dialect.entries.length">من كلماتها</h2>
    <dl v-if="dialect.entries.length" :aria-busy="shuffling">
      <div v-for="e in dialect.entries" :key="e.id">
        <dt>
          <b>{{ e.form }}</b>
          <NuxtLink v-if="e.dialect.slug !== dialect.slug" :to="`/d/${e.dialect.slug}`" rel="tag">{{ e.dialect.nameAr }}</NuxtLink>
        </dt>
        <dd>
          <p v-if="e.words.length">
            بالفصحى:
            <template v-for="(w, i) in e.words" :key="w.id">
              <template v-if="i">، </template><NuxtLink :to="`/w/${w.id}`">{{ w.headword }}</NuxtLink>
            </template>
          </p>
          <p v-if="e.meaning">{{ e.meaning }}</p>
        </dd>
      </div>
    </dl>
    <p v-else>لا توجد كلمات بعد في هذه اللهجة.</p>
    <ShuffleButton v-if="dialect.entries.length" label="كلمات أخرى" :busy="shuffling" @shuffle="refresh" />
  </article>
</template>
