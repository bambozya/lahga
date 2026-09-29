<script setup lang="ts">
// The search term as a dialect word (/api/forms): «عيش» answered as what it
// means, with its own page one click away. Sits first in the results <dl>,
// above the MSA words that WordCard lists, so someone who typed a word they
// heard sees its meaning before the words it is one form of.
defineProps<{
  form: {
    form: string
    slug: string
    senses: {
      word: { id: number, slug: string | null, headword: string }
      entries: { dialect: { nameAr: string, top: boolean } }[]
    }[]
  }
}>()
</script>

<template>
  <div class="form-card">
    <dt><NuxtLink :to="`/f/${form.slug}`">{{ form.form }}</NuxtLink> <small>بالعامية · {{ namesOf(form.senses).join('، ') }}</small></dt>
    <dd>
      <p class="glance">
        <span>معناها بالفصحى:</span>
        <template v-for="(s, i) in form.senses" :key="s.word.id">
          <template v-if="i"> · </template><NuxtLink :to="`/w/${s.word.slug}`"><b>{{ s.word.headword }}</b></NuxtLink><small v-if="form.senses.length > 1">{{ whoSays(s) }}</small>
        </template>
      </p>
    </dd>
  </div>
</template>

<style scoped>
/* A direct answer, not one result among many: set off with the accent rule. */
.form-card { border-inline-start: 3px solid var(--accent); padding-inline-start: var(--space-s); }
</style>
