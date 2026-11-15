<script setup lang="ts">
/**
 * The symbol table for the pronunciation field: CAPHI, the ASCII notation
 * from the CODA* paper (shared/utils/caphi.ts holds the inventory, so this
 * page and the validator cannot disagree). Linked from the forms that ask for
 * a pronunciation and from the line that shows one.
 */
import { CAPHI_GROUPS, CAPHI_MARKERS } from '../../shared/utils/caphi'
useSeo({
  title: 'النطق بالرموز',
  description: 'كيف يُكتب نطق الكلمة الدارجة في معجم لهجة: ترميز CAPHI، رمز لاتيني لكل صوت وبين الأصوات مسافة، مع جدول الرموز وأمثلتها.',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'النطق بالرموز' }]" />
    <h1>النطق بالرموز</h1>
    <p>
      الحرف العربي يكتب الكلمة ولا يقول كيف تُنطق: القاف واحدة في «قال»، وتُسمع
      في القاهرة همزةً، وفي الخليج g، وفي فاس قافاً. والحركات لا تحيط بكل حركة
      تقولها اللهجات. فلكل شكل في المعجم حقل للنطق، يُكتب بترميز CAPHI.
    </p>

    <section>
      <h2>القاعدة</h2>
      <p>
        رمز لكل صوت، وبين كل رمزين مسافة. الرموز حروف لاتينية صغيرة وثلاثة
        أرقام، فتُكتب من أي لوحة مفاتيح: «دلوقتي» المصرية
        <code dir="ltr">d i l w a 2 t i</code>،
        و«هلّق» الشامية <code dir="ltr">h a l l a 2</code>.
      </p>
      <ul>
        <li>الشدّة: الصامت مرتين، «حبّ» <code dir="ltr">7 a b b</code>.</li>
        <li>حرف المد: الحركة مرتين، «دار» <code dir="ltr">d aa r</code>.</li>
        <li>التفخيم: نقطة بعد الرمز، «طبق» <code dir="ltr">t. a b a g</code>.</li>
        <li>الحروف الحلقية بأرقامها المعروفة: <code dir="ltr">2</code> للهمزة، <code dir="ltr">3</code> للعين، <code dir="ltr">7</code> للحاء.</li>
        <li>يُكتب ما يُسمع، لا ما يُرسم: قاف الخليج <code dir="ltr">g</code>، وقاف القاهرة <code dir="ltr">2</code>، وجيم الشام <code dir="ltr">j</code>.</li>
        <li>ويجوز، إن شئت، فصل أجزاء الكلمة بـ<code dir="ltr">{{ CAPHI_MARKERS[0] }}</code> والكلمات بـ<code dir="ltr">{{ CAPHI_MARKERS[1] }}</code>: <code dir="ltr">m a + b i 2 uu l + h aa + sh</code>.</li>
      </ul>
      <p>
        والحقل اختياري؛ ومن كتبه فبرموز هذا الجدول وحدها، فما ليس فيه يُرفض عند
        الإدخال.
      </p>
    </section>

    <section v-for="g in CAPHI_GROUPS" :key="g.title">
      <h2>{{ g.title }}</h2>
      <table>
        <thead>
          <tr><th scope="col">الرمز</th><th scope="col">الصوت</th><th scope="col">مثال</th><th scope="col"><abbr title="الألفبائية الصوتية الدولية">IPA</abbr></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in g.symbols" :key="s.symbol">
            <td><code dir="ltr">{{ s.symbol }}</code></td>
            <td>{{ s.sound }}</td>
            <td>{{ s.example }} <code dir="ltr">{{ s.caphi }}</code> <small>{{ s.dialect }}</small></td>
            <td dir="ltr">{{ s.ipa }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>المصدر</h2>
      <p>
        الترميز من مختبر CAMeL في جامعة نيويورك أبوظبي، والجدول والأمثلة من ورقة
        <a href="https://aclanthology.org/L18-1574/" rel="noopener">Unified Guidelines and Resources for Arabic Dialect Orthography</a>
        (Habash et al., LREC 2018)، التي تضع أيضاً قواعد CODA* لكتابة الكلمة
        الدارجة. وموارد المختبر في
        <a href="http://resources.camel-lab.com/" rel="noopener">resources.camel-lab.com</a>.
      </p>
    </section>
  </article>
</template>

<style scoped>
/* Set like the about page: parts under the heavy rule, the standfirst a step up.
   The table itself takes the site's table styles; only the runs need care. */
section { margin-block-start: var(--space-l); padding-block-start: var(--space-m); border-block-start: var(--rule); }
h1 + p { font-size: var(--step-1); line-height: 1.7; }
/* A run never wraps inside itself, and the symbol column reads at text size. */
td code { white-space: nowrap; }
td:first-child > code { font-size: var(--step-0); }
td > small { color: var(--muted); }
</style>
