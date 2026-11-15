<script setup lang="ts">
/**
 * The house style for how a dialect word is written in the dictionary (#46):
 * one conventional spelling per form, following CODA* (Habash et al., LREC
 * 2018). The rules that decide most cases, one screen long, in Arabic; the
 * full guidelines and the lexicon to look a spelling up in are linked at the
 * end. Linked from the add and edit forms and from the about page. The
 * script scripts/coda-flags.ts checks what it can of these rules.
 */
useSeo({
  title: 'كيف تُكتب الكلمة',
  description: 'كيف يكتب معجم لهجة الكلمة الدارجة: كتابة واحدة لكل كلمة على قواعد CODA*، الحروف على أصلها والنطق في حقله، والكتابات الأخرى تحتها.',
})
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'كيف تُكتب الكلمة' }]" />
    <h1>كيف تُكتب الكلمة</h1>
    <p>
      الدارجة بلا إملاء، فالكلمة الواحدة تُرى على الشبكة بعشرين رسماً. يختار
      المعجم لكل كلمة رسماً واحداً هو عنوانها، على قواعد
      <abbr title="Conventional Orthography for Dialectal Arabic">CODA*</abbr>
      التي وضعها مختبر CAMeL لكل اللهجات بالقواعد نفسها، ويسجّل الرسوم الأخرى
      تحتها («وتُكتب أيضاً») فتقود كلها إلى الكلمة. والنطق له
      <NuxtLink to="/pronunciation">حقله</NuxtLink>، فلا يحمله الرسم.
    </p>

    <section>
      <h2>القواعد التي تحسم أكثر الحالات</h2>
      <ol>
        <li>
          <b>الحرف على أصله، لا على صوته.</b> القاف قاف وإن قيلت g أو همزة:
          «قال» في الخليج والقاهرة ودمشق جميعاً، لا «گال» ولا «آل». والثاء
          والذال والظاء كذلك: «ثلاثة» لا «تلاتة»، «ذهب» لا «دهب»، «ظهر» لا «ضهر».
          كيف تُنطق؟ في حقل النطق.
        </li>
        <li>
          <b>التاء المربوطة تبقى.</b> «مدرسة» لا «مدرسه»، وإن سُمعت هاءً أو تاءً.
        </li>
        <li>
          <b>«ما» كلمة وحدها.</b> «ما قالش» لا «ماقالش»، و«ما بيقولهاش» لا
          «مابيقولهاش». وتلتصق بالضمير وحده: «ماهوش»، «مانيش»، «مافيش».
        </li>
        <li>
          <b>الضمائر والـ«ش» وحروف الجر الملتصقة تُكتب متصلة</b> كما في الفصحى:
          «قالها»، «كتابه»، «قالش». واللام والباء ونحوها كلمة وحدها حين تكون
          كلمة: «قال له» لا «قاللو».
        </li>
        <li>
          <b>واو الجماعة بألفها.</b> «قالوا» لا «قالو»، وإن لم تُسمع الألف.
        </li>
        <li>
          <b>الحروف الدخيلة لصوت لا حرف له.</b> گ وڨ وݣ لصوت g في كلمة ليس
          أصلها قافاً: «گاراج»، «ڨانز»؛ وچ لـ«تش»: «چاي»؛ وڤ لـv: «ڤيلا»؛ وپ لـp:
          «پارك». فإن كان الأصل قافاً فهي قاف، والصوت في النطق.
        </li>
        <li>
          <b>الهمزة في أول الكلمة تجوز بلا رسم.</b> «احنا» و«إحنا» سواء؛ والأرجح
          ما يكتبه أهل اللهجة. وفي وسط الكلمة وآخرها كما في الفصحى.
        </li>
      </ol>
      <p>
        وما لم تحسمه هذه السطور يحسمه الأصل: كيف تُكتب الكلمة الفصيحة التي جاءت
        منها، أو كيف كتبها معجم CODA* لمدينة قريبة.
      </p>
    </section>

    <section>
      <h2>ماذا يعني هذا لمن يضيف كلمة</h2>
      <ul>
        <li>اكتب الكلمة على هذه القواعد، أو كما تعرفها إن لم تكن متأكداً: المراجعون يسوّونها.</li>
        <li>إن كان الناس يكتبونها بغير ذلك، فاذكر رسومهم في «كتابات أخرى»، فيجدها البحث كلها.</li>
        <li>إن كان الرسم يخفي النطق، فاكتب النطق في حقله برموز <NuxtLink to="/pronunciation">CAPHI</NuxtLink>.</li>
        <li>الكلمات القديمة في المعجم كُتبت كما يكتبها أهلها؛ ونسوّيها على هذه القواعد كلمةً كلمة، وكل تسوية في سجل الكلمة.</li>
      </ul>
    </section>

    <section>
      <h2>المصدر</h2>
      <p>
        القواعد من ورقة
        <a href="https://aclanthology.org/L18-1574/" rel="noopener">Unified Guidelines and Resources for Arabic Dialect Orthography</a>
        (Habash et al., LREC 2018)، وموارد CODA* كاملة، ومنها معجم MADAR لثماني
        وعشرين مدينة الذي يُراجَع فيه رسم الكلمة، في
        <a href="http://resources.camel-lab.com/" rel="noopener">resources.camel-lab.com</a>.
        معجم MADAR مرجع نراجع فيه، لا مصدر ننقل منه: رخصته لا تسمح بالنقل.
      </p>
    </section>
  </article>
</template>

<style scoped>
section { margin-block-start: var(--space-l); padding-block-start: var(--space-m); border-block-start: var(--rule); }
h1 + p { font-size: var(--step-1); line-height: 1.7; }
ol > li + li, ul > li + li { margin-block-start: var(--space-2xs); }
</style>
