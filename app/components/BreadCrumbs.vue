<script setup lang="ts">
/**
 * The trail back up, on every page but the home page — which is the root, and
 * would only ever point at itself.
 *
 * It also emits the BreadcrumbList structured data, so what a search result
 * shows above the title is the same trail the page shows, rather than a second
 * one maintained by hand somewhere else.
 *
 * The last crumb is the current page: no link, and marked aria-current so a
 * screen reader announces it as where you already are.
 */
const props = defineProps<{ trail: { label: string, to?: string }[] }>()

const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const crumbs = computed(() => [{ label: 'الرئيسية', to: '/' }, ...props.trail])

useHead(() => ({
  script: [{
    key: 'ld-breadcrumbs',
    type: 'application/ld+json',
    // "<" escaped so a stray tag in a headword cannot close the script element.
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.value.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.label,
        ...(c.to ? { item: site + c.to } : {}),
      })),
    }).replace(/</g, '\\u003c'),
  }],
}))
</script>

<template>
  <nav class="crumbs" aria-label="مسار التنقل">
    <ol>
      <li v-for="(c, i) in crumbs" :key="i">
        <NuxtLink v-if="c.to && i < crumbs.length - 1" :to="c.to">{{ c.label }}</NuxtLink>
        <span v-else aria-current="page">{{ c.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
/* A whisper above the title: it orients, it does not announce. */
.crumbs { margin-block-end: var(--space-xs); }
.crumbs ol {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 0.4em;
  list-style: none; padding: 0; margin: 0;
  font-size: var(--step--1); color: var(--muted);
}
/* The separator points the way the line is read, so it leans with the script. */
.crumbs li + li::before { content: '‹'; margin-inline-end: 0.4em; color: var(--hair); }
.crumbs a { color: inherit; text-decoration-color: var(--hair); }
.crumbs a:hover { color: var(--ink); text-decoration-color: var(--accent); }
.crumbs [aria-current="page"] { color: var(--ink); }
</style>
