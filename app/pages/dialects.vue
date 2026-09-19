<script setup lang="ts">
// ?all=1: this page is the map of the language, so it shows the whole tree,
// including the corners nobody has written in yet. Those are drawn faint and
// carry an invitation rather than a word count — elsewhere (the group pages,
// the sitemap) an empty dialect stays unlisted until it has something in it.
const { data: dialects } = await useFetch('/api/dialects', { query: { all: 1 } })
/** The ones with words first; the empty ones trail behind them, in order. */
const byContent = <T extends { words: number }>(children: T[]) =>
  [...children].sort((a, b) => Number(b.words > 0) - Number(a.words > 0))
useSeo({
  title: 'اللهجات العربية',
  description: 'اللهجات العربية مرتبة في مجموعات: المصرية والشامية والخليجية والنجدية والحجازية واليمنية والعراقية والسودانية والمغاربية والحسانية، وما يتفرع عنها.',
})
</script>

<template>
  <article>
    <h1>اللهجات</h1>
    <p>اللهجات مرتبة في مجموعات كبرى تتفرع منها لهجات أدق. اختر ما تعرفه، ولو كان المجموعة فقط.</p>
    <p class="key">ما كان منها باهتاً فلا كلمات فيه بعد، وصفحته تنتظر أول كلمة.</p>
    <div role="region" aria-labelledby="dialects-caption" tabindex="0">
      <!-- The roles say in words what the elements already say, because on a
           narrow screen the stylesheet stacks this table into blocks, and a
           table whose display is no longer table stops being a table to a
           screen reader unless it is told otherwise. -->
      <table role="table">
        <caption id="dialects-caption">مجموعات اللهجات وما يتفرع منها</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col">المجموعة</th>
            <th role="columnheader" scope="col">اللهجات الفرعية</th>
            <th role="columnheader" scope="col">الوصف</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          <tr v-for="d in dialects" :key="d.id" role="row">
            <th role="rowheader" scope="row"><NuxtLink :to="`/d/${d.slug}`">{{ d.nameAr }}</NuxtLink></th>
            <td role="cell" data-label="اللهجات الفرعية" :class="{ empty: !d.children.length }">
              <template v-for="c in byContent(d.children)" :key="c.id">
                <NuxtLink :to="`/d/${c.slug}`" rel="tag" :class="{ bare: !c.words }">
                  {{ c.nameAr }}<span v-if="!c.words"> (لا كلمات بعد)</span>
                </NuxtLink>{{ ' ' }}
              </template>
            </td>
            <td role="cell">{{ d.summaryAr }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<style scoped>
.key { color: var(--muted); font-size: var(--step--1); }
/* A dialect nobody has written in yet: still a link, and still reads as one,
   but plainly lighter than the names that lead to words. The note inside it is
   for screen readers and for anyone who wonders why it looks different. */
.bare { color: var(--muted); text-decoration-style: dashed; }
.bare > span {
  position: absolute; width: 1px; height: 1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}

/* Three columns are a table on a desk and a wall on a phone: 34rem of table in
   a 24rem window, read by dragging it sideways a column at a time. Below 48rem
   each row becomes its own block — the group's name above it as a heading, its
   sub-dialects and its description beneath — and nothing scrolls sideways. */
@media (width < 48rem) {
  /* Both of these beat the global table rules, which hold a table to 34rem
     and let the region scroll it; stacked, it is as wide as the screen. */
  [role="region"][tabindex] { overflow: visible; }
  [role="region"][tabindex] > table { min-width: 0; }
  /* The column headers become the labels on the cells, so they are read once
     each rather than once per row. */
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  tr { display: block; }
  th, td { display: block; padding: 0; border: 0; }
  tbody tr { border-block-end: var(--thin); padding-block: var(--space-s); }
  tbody th { font-size: var(--step-2); white-space: normal; }
  td { margin-block-start: var(--space-xs); }
  /* Only the sub-dialects need naming; a description announces itself. */
  td[data-label]::before {
    content: attr(data-label);
    display: block; margin-block-end: var(--space-3xs);
    font: 400 var(--step--1)/1.6 var(--sans); color: var(--muted);
  }
  /* A group with no sub-dialects says nothing, rather than saying nothing under a heading. */
  td.empty { display: none; }
}
</style>
