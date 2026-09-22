<script setup lang="ts">
useSeo({ title: 'عن الموقع', description: 'لهجة قاموس تشاركي للهجات العربية: يربط كل كلمة دارجة بمعناها بالفصحى ليظهر كيف تُقال الفكرة نفسها في أنحاء الوطن العربي.' })
// The list of dialects is read from the database rather than written here: a
// list typed by hand went out of date the day نجدي and حجازي became groups of
// their own. ?all=1 as on /dialects — a dialect is supported from the moment a
// word can be filed under it, not from the moment someone has done so.
const { data: dialects } = await useFetch('/api/dialects', { query: { all: 1 } })
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'عن الموقع' }]" />
    <h1>عن موقع لهجة</h1>
    <p>قاموس إلكتروني عربي بين اللغة العربية الفصحى ولهجاتها الدارجة.</p>
    <p>
      هذا الموقع للاحتفاء بالثقافات العربية المتعددة وللتبادل الإيجابي البناء
      بين هذه الثقافات.
    </p>
    <p>
      هذا الموقع لا يمجد القومية ويرفض العنصرية أو التمييز على أساس عرقي أو
      ثقافي.
    </p>

    <!-- Six parts, each an <h2> under the one heavy rule the stylesheet below
         draws; what belongs to a part sits inside it under an <h3>. No <hr>
         anywhere: a line typed by hand is a line that ends up in the wrong
         place the next time a section moves. -->
    <section id="vision">
      <h2>رؤيتنا</h2>
      <p>
        نسعى إلى بناء أكبر قاموس تفاعلي للهجات العربية، يساهم في الحفاظ على
        التنوع اللغوي والثقافي في العالم العربي، ويسهل التواصل بين المتحدثين
        باللهجات المختلفة.
      </p>
      <p>
        نؤمن بأن اللهجات العربية هي جزء أساسي من هويتنا الثقافية، وتستحق
        التوثيق والدراسة والاحتفاء بها.
      </p>
    </section>

    <section id="dictionary">
      <h2>القاموس</h2>

      <h3 id="content">المحتوى</h3>
      <p>
        كل صفحة في القاموس تبدأ من معنى بالعربية الفصحى: كلمة أو عبارة قصيرة أو
        مثل شعبي. وتحت هذا المعنى تجتمع الأشكال التي يُقال بها في اللهجات، كل
        شكل منها منسوب إلى لهجته.
      </p>
      <p>ويمكن أن يحمل كل شكل:</p>
      <ul>
        <li>معنى أخص إن كان استعماله في لهجته يختلف عن المعنى الفصيح</li>
        <li>ملاحظات عن استعماله: متى يُقال، ومن يقوله، وما لونه</li>
        <li>أمثلة مكتوبة باللهجة نفسها، مع شرحها بالفصحى</li>
      </ul>
      <p>
        ولا تستحق الكلمة صفحة إلا إذا اختلفت اللهجات في قولها؛ فما يقوله العرب
        جميعاً بلفظ واحد لا يحتاج إلى قاموس.
      </p>

      <h3 id="dialects">اللهجات المدعومة</h3>
      <p>حالياً، يدعم موقع «لهجة» المجموعات التالية وما يتفرع عنها:</p>
      <ul>
        <li v-for="d in dialects" :key="d.id">
          <NuxtLink :to="`/d/${d.slug}`">{{ d.nameAr }}</NuxtLink>
          <template v-for="c in d.children" :key="c.id">
            {{ ' ' }}<NuxtLink :to="`/d/${c.slug}`" rel="tag">{{ c.nameAr }}</NuxtLink>
          </template>
        </li>
      </ul>
      <p>
        بعض هذه اللهجات ما زال ينتظر كلمته الأولى؛
        <NuxtLink to="/dialects">صفحة اللهجات</NuxtLink> تبيّن أيها، مع وصف لكل
        مجموعة. ونخطط لإضافة المزيد من اللهجات في المستقبل.
      </p>

      <h3 id="sources">المصادر</h3>
      <p>
        بعض الكلمات الفلسطينية مأخوذة من معجم
        <a href="https://sites.google.com/nyu.edu/palestine-lexicon" rel="noopener">Maknuune</a>
        المفتوح لجامعة نيويورك أبوظبي، المرخّص برخصة
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">Creative Commons BY-SA 4.0</a>،
        وبعض الكلمات الأردنية من مواد
        <a href="https://files.peacecorps.gov/uploads/wws/lesson-plans/files/JO_Arabic_Language_Lessons.pdf" rel="noopener">Peace Corps</a>
        التعليمية، وهي في الملكية العامة.
      </p>

      <h3 id="license">الرخصة</h3>
      <p>
        القاموس ملك لمن يتكلمون هذه اللهجات، فمحتواه كله متاح برخصة
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ar" rel="license noopener">المشاع الإبداعي: نَسب المُصنَّف - الترخيص بالمثل 4.0 (CC BY-SA 4.0)</a>.
        يحق لك أن تنسخه وتوزعه وتبني عليه لأي غرض، بشرطين: أن تنسبه إلى «لهجة»
        مع رابط إلى الموقع، وأن تنشر ما تبنيه عليه بالرخصة نفسها. والتفاصيل في
        <NuxtLink to="/terms#license">شروط الاستخدام</NuxtLink>.
      </p>
    </section>

    <section id="how-it-works">
      <h2>كيف يعمل الموقع؟</h2>

      <h3>البحث والتصفح</h3>
      <p>
        خانة البحث في أعلى كل صفحة تقبل الكلمة بالفصحى أو بأي لهجة، وتقترح
        الأقرب إن لم تجد ما كُتب. ولكل لهجة صفحة تعرض كلماتها، والصفحة
        الرئيسية تسحب كلمات عشوائية لمن جاء يتصفح.
      </p>

      <h3>ربط اللهجات</h3>
      <p>
        يتم ربط الكلمات التي تحمل نفس المعنى في لهجات مختلفة، مما يسهل فهم
        التنوع اللغوي بين اللهجات العربية. ويمكن وضع لهجتين جنباً إلى جنب
        لرؤية الكلمات التي تختلفان فيها.
      </p>

      <h3 id="more">أكثر من قاموس</h3>
      <ul>
        <li><NuxtLink to="/games">الألغاز</NuxtLink>: لعبتان جديدتان كل يوم، بلا حساب: خمّن الكلمة من أشكالها في اللهجات، أو خمّن اللهجة من شكل الكلمة.</li>
        <li><NuxtLink to="/divergent">الكلمات التي تختلف عليها اللهجات أكثر</NuxtLink>: القاموس مرتباً بحسب اختلاف اللهجات على كل كلمة.</li>
      </ul>
    </section>

    <section id="join">
      <h2>انضم إلينا</h2>
      <p>
        نرحب بمساهماتكم في إثراء قاموس «لهجة» بالكلمات والتعبيرات من لهجاتكم
        المحلية. كلما زادت المساهمات، أصبح القاموس أكثر شمولاً وفائدة للجميع.
      </p>

      <h3>إضافة الكلمات</h3>
      <p>
        يمكن لكل من له حساب مؤكَّد البريد أن يضيف كلمة جديدة، أو شكلاً من لهجته
        لكلمة موجودة، أو مثالاً على الاستعمال. ولكل صفحة سجلّ يحفظ تعديلاتها،
        وما يُضاف يُنشر باسم صاحبه وبرخصة القاموس نفسها.
      </p>

      <h3>الإبلاغ عن الأخطاء</h3>
      <p>
        من رأى خطأً (لهجة غير صحيحة أو ربطاً خاطئاً بالفصحى أو محتوى مسيئاً)
        أبلغ عنه من صفحة الكلمة نفسها، فيُراجَع.
      </p>

      <p><NuxtLink to="/">تصفح الكلمات</NuxtLink> أو <NuxtLink to="/add-word">اقترح كلمة</NuxtLink>.</p>
    </section>

    <section id="story">
      <h2>قصة الفكرة</h2>
      <p>
        أنا ابن خلدون، صاحب هذا الموقع ومصممه ومنتجه ومبرمجه (بمساعدة
        claude.ai، لأني كسول بصراحة). اخترت هذا الاسم تحيةً لمؤرخ نشأ بين
        الأندلس وتونس ومصر، ولاحظ قبل الجميع كيف تتفرّع اللغة العربية الواحدة
        إلى لهجات بعدد الأمصار.
      </p>
      <p>
        نشأت أنا بين القاهرة والرياض. وفي القاهرة تعرّفت، عبر أصدقاء مشتركين،
        على فتاة جزائرية نشأت بين قسنطينة وباريس. سأسمّيها هنا زينب، تيمناً
        بزينب بنت إسحاق النفزاوية، إحدى أشهر نساء الأمازيغ في عصر دولة
        المرابطين، والتي قال عنها ابن خلدون: «كانت إحدى نساء العالم المشهورات
        بالجمال والرئاسة». ولم أجد وصفاً أدق منه لزينب التي عرفتها.
      </p>
      <p>
        كانت المسافة بين لهجتينا أكبر مما توقعت، فانتهى بنا الحديث إلى
        الإنجليزية رغم شغفي باللهجات العربية. كنت أبحث دائماً عن الكلمة
        الدارجة المناسبة لأُبهر ضيفتي فلا أجدها، وأكتشف أن حصيلتي من الدارجة
        المغاربية أضيق بكثير مما ظننت.
      </p>
      <p>
        من ذلك العجز وُلدت فكرة موقع يجمع كلمات كل لهجة عربية ويربطها بمعناها
        الفصيح، حتى لا يقف أحد عاجزاً عن كلمة كما وقفت أنا. مرّت سنوات طويلة
        قبل أن أحوّل الفكرة إلى موقع فعلي، وها هو أخيراً بين أيديكم.
      </p>
    </section>

    <section id="contact">
      <h2>تواصل معنا</h2>
      <p>
        إذا كان لديك أي اقتراحات أو استفسارات، أو ترغب في المساهمة في تطوير
        الموقع، يمكنك التواصل معنا عبر:
      </p>
      <address>
        البريد الإلكتروني: <a href="mailto:info@lahga.fyi">info@lahga.fyi</a><br />
        أو من خلال <NuxtLink to="/contact">نموذج الاتصال</NuxtLink>
      </address>
    </section>
  </article>
</template>

<style scoped>
/* The page's whole outline, said once. A part opens under the heavy rule with
   room above it; an <h3> gets more air than a paragraph and less than a part,
   so the three levels can be told apart by the space around them alone. */
section { margin-block-start: var(--space-l); padding-block-start: var(--space-m); border-block-start: var(--rule); }
* + h3 { margin-block-start: var(--space-m); }
/* The sentence under the title is the site's definition of itself: it is read
   as the standfirst, a step above the running text. */
h1 + p { font-size: var(--step-1); line-height: 1.7; }
/* The closing invitation of «انضم إلينا» stands apart from the paragraph before it. */
#join > p:last-child { margin-block-start: var(--space-m); }
</style>
