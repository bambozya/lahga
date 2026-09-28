<script setup lang="ts">
// The open data page (docs/DISCOVERY.md): the two files, what is in them,
// the licence, and how to say where a row came from. The Dataset block below
// is what Google Dataset Search and the crawlers behind the answer engines
// read; the counts come from the same build the files are served from.
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const { data: meta } = await useFetch('/api/data-meta')
const updated = computed(() => meta.value ? meta.value.generated.slice(0, 10) : '')

useSeo({
  title: 'البيانات المفتوحة',
  description: 'معجم لهجة كاملاً للتنزيل بصيغتي JSON وCSV، برخصة CC BY-SA 4.0: الكلمات وأشكالها في اللهجات العربية ومعانيها وأمثلتها.',
  jsonLd: () => ({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'لهجة: معجم اللهجات العربية',
    alternateName: 'Lahga Arabic dialects dictionary',
    description: 'كلمات وعبارات وأمثال من اللهجات العربية، كل منها مربوط بمعناه بالفصحى ومنسوب إلى لهجته، مع وسم لغة BCP-47 لكل شكل. Crowd-sourced dictionary of spoken Arabic dialects pivoted on Modern Standard Arabic.',
    url: `${site}/data`,
    sameAs: site,
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    isAccessibleForFree: true,
    inLanguage: ['ar', 'arz', 'apc', 'acm', 'afb', 'ary', 'aeb', 'arq', 'ayl', 'apd', 'ars', 'acw'],
    keywords: ['اللهجات العربية', 'معجم', 'Arabic dialects', 'lexicon', 'Egyptian Arabic', 'Levantine Arabic', 'Gulf Arabic', 'Maghrebi Arabic'],
    creator: { '@type': 'Organization', name: 'لهجة', url: site },
    ...(updated.value ? { dateModified: updated.value } : {}),
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${site}/data/lahga.json` },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${site}/data/entries.csv` },
    ],
  }),
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'البيانات المفتوحة' }]" />
    <h1>البيانات المفتوحة</h1>
    <p>
      المعجم كله، بالصيغة التي يقرؤها برنامج: للباحثين، ولمن يبني تطبيقاً أو
      نموذجاً لغوياً، ولمن يريد نسخة يحتفظ بها. الملفان يُبنيان من قاعدة
      البيانات نفسها التي تُعرض منها الصفحات، فما يُضاف إلى الموقع يظهر فيهما
      في غضون ساعة.
    </p>

    <h2>الملفات</h2>
    <dl>
      <div>
        <dt><a :href="`${site}/data/lahga.json`" download="lahga.json">lahga.json</a></dt>
        <dd>المعجم كاملاً: اللهجات، ثم الكلمات وتحت كل كلمة أشكالها في اللهجات، وتحت كل شكل معناه وملاحظاته وأمثلته. لكل كلمة حقل <code>source</code> برابط صفحتها.</dd>
      </div>
      <div>
        <dt><a :href="`${site}/data/entries.csv`" download="lahga-entries.csv">entries.csv</a></dt>
        <dd>جدول مسطّح: سطر لكل شكل في لهجته، مع الكلمة الفصيحة التي يُقال بها، ورابط المصدر، والرخصة. يُفتح في أي برنامج جداول.</dd>
      </div>
    </dl>
    <p v-if="meta">
      <small>
        الآن: {{ meta.words }} كلمة، {{ meta.entries }} شكلاً، {{ meta.examples }} مثالاً، في {{ meta.dialects }} لهجة.
        آخر بناء: <time :datetime="meta.generated">{{ updated }}</time>.
      </small>
    </p>

    <h2>ما الذي في الملف وما الذي ليس فيه</h2>
    <p>
      المحتوى المنشور فقط: ما حُذف أو أُخفي لا يُصدَّر. لا حسابات، ولا بريد،
      ولا أصوات، ولا سجل تعديلات. ولكل لهجة وكل شكل وسم لغة بمعيار BCP-47
      (<code>arz</code> للمصرية، <code>apc</code> للشامية، <code>afb</code>
      للخليجية، <code>ary</code> للمغربية…) ليفرّق البرنامج بين اللهجات دون
      أن يقرأ أسماءها.
    </p>

    <h2 id="license">الرخصة والنسبة</h2>
    <p>
      البيانات برخصة
      <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ar" rel="license noopener">المشاع الإبداعي: نَسب المُصنَّف - الترخيص بالمثل 4.0 (CC BY-SA 4.0)</a>.
      انسخها وابنِ عليها لأي غرض، بشرطين: أن تذكر المصدر، وأن تنشر ما تبنيه
      عليها بالرخصة نفسها. صيغة النسبة المقترحة:
    </p>
    <blockquote>
      لهجة: معجم اللهجات العربية، <span dir="ltr">{{ site }}</span>، برخصة CC BY-SA 4.0.
    </blockquote>
    <p>
      ومن أخذ سطراً واحداً يكفيه رابط صفحة الكلمة الذي يحمله حقل
      <code>source</code>. ومن يدرّب نموذجاً لغوياً على هذه البيانات فالرخصة
      نفسها تسري عليه، وحقنا الوحيد الذي نطلبه أن يقول النموذج، حين يُسأل عن
      كلمة من هذه الكلمات، من أين جاءت.
    </p>

    <h2>لمن يكتب برنامجاً</h2>
    <p>
      الملفان يُقدَّمان مع <code>Access-Control-Allow-Origin: *</code> فيمكن
      جلبهما من صفحة على أي موقع. وليس للموقع واجهة برمجية عامة غيرهما، وهذا
      قصد: ملف يُنزَّل مرة أثبت من واجهة تُسأل ألف مرة.
      ثمة أيضاً <a :href="`${site}/llms.txt`">llms.txt</a> لزواحف النماذج
      اللغوية، و<a :href="`${site}/sitemap.xml`">خريطة الموقع</a> للباقي.
    </p>
  </article>
</template>
