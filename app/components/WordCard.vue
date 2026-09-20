<script setup lang="ts">
// One index result: a <dt> (the MSA headword) and a <dd> (definition and the
// dialect forms that map to it). Must sit in a <dl>.
const props = defineProps<{
  word: {
    id: number
    slug: string
    headword: string
    definition: string | null
    entries: { id: number, form: string, dialect: { slug: string, nameAr: string } }[]
  }
  /** A word's evidence where a list is ranked by something — /divergent says how many forms across how many dialects. */
  note?: string
}>()

// The same glance the word's own page opens with, in the same order: the form
// once, then everyone who says it. Nothing is held back — a form the card hides
// is the very thing someone came to read, and saying each form once keeps the
// line short enough that it never needs to be.
const forms = computed(() => formsOf(props.word.entries))
</script>

<template>
  <div>
    <dt><NuxtLink :to="`/w/${word.slug}`">{{ word.headword }}</NuxtLink> <small>{{ note ?? 'بالفصحى' }}</small></dt>
    <dd>
      <p v-if="word.definition">{{ word.definition }}</p>
      <p v-if="forms.length" class="glance">
        <span>تُقال:</span>
        <template v-for="(f, i) in forms" :key="f.form">
          <template v-if="i">، </template><b>{{ f.form }}</b> <small>{{ f.dialects.join('، ') }}</small>
        </template>
      </p>
    </dd>
  </div>
</template>
