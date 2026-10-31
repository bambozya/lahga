<script setup lang="ts">
useSeo({ title: 'عن الموقع', description: 'لهجة معجم تشاركي للهجات العربية: كل صفحة فيه معنى واحد، تجتمع تحته الكلمة التي تقوله بها كل لهجة في أنحاء الوطن العربي.' })
// The list of dialects is read from the database rather than written here: a
// list typed by hand went out of date the day نجدي and حجازي became groups of
// their own. ?all=1 as on /dialects — a dialect is supported from the moment a
// word can be filed under it, not from the moment someone has done so.
const { data: dialects } = await useFetch('/api/dialects', { query: { all: 1 } })
const size = useDictionarySize()
</script>

<template>
  <article>
    <BreadCrumbs :trail="[{ label: 'عن الموقع' }]" />
    <h1>عن موقع لهجة</h1>
    <p>معجم إلكتروني للهجات العربية، يجمع لكل معنى الكلمة التي تقوله بها كل لهجة.</p>
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
        نسعى إلى بناء أكبر معجم تفاعلي للهجات العربية، يساهم في الحفاظ على
        التنوع اللغوي والثقافي في العالم العربي، ويسهل التواصل بين المتحدثين
        باللهجات المختلفة.
      </p>
      <p>
        نؤمن بأن اللهجات العربية هي جزء أساسي من هويتنا الثقافية، وتستحق
        التوثيق والدراسة والاحتفاء بها.
      </p>
    </section>

    <section id="dictionary">
      <h2>المعجم</h2>

      <h3 id="content">المحتوى</h3>
      <!-- The page is a meaning and the Fusha word is only its title. Said in
           so many words because dialectologists (AIDA, 2026-10) read «linked to
           its Fusha equivalent» as Fusha being the yardstick, which the field
           rejects: each dialect is a system of its own, compared to the others
           through the meaning, the way the Wortatlas uses German titles. -->
      <p>
        كل صفحة في المعجم معنى واحد، وتحته تجتمع الكلمات التي يُقال بها في
        اللهجات، كل كلمة منها منسوبة إلى لهجتها. وعنوان الصفحة كلمة بالفصحى أو
        عبارة قصيرة أو مثل شعبي، وإن لم يكن للمعنى كلمة فصيحة واحدة تؤديه، صار
        عنوانه عبارة تشرحه.
      </p>
      <p>
        والفصحى هنا لغة العناوين فقط، لأنها اللغة التي يقرؤها العرب جميعاً، لا
        أصل تُقاس عليه اللهجات. فكل لهجة نظام قائم بذاته، وكلمتها للمعنى هي
        كلمتها، جاءت من أصل فصيح أم من غيره. والمقارنة في المعجم بين اللهجات
        نفسها، عبر المعنى الذي تشترك فيه.
      </p>
      <p>ويمكن أن يحمل كل شكل:</p>
      <ul>
        <li>معنى أخص إن كان استعماله في لهجته أضيق أو أوسع من معنى الصفحة</li>
        <li>ملاحظات عن استعماله: متى يُقال، ومن يقوله، وما لونه</li>
        <li>أمثلة مكتوبة باللهجة نفسها، مع شرحها بالفصحى</li>
      </ul>
      <p>
        ولا تستحق الكلمة صفحة إلا إذا اختلفت اللهجات في قولها؛ فما يقوله العرب
        جميعاً بلفظ واحد لا يحتاج إلى معجم.
      </p>
      <p v-if="size.ready.value && size.dialects.value">
        وفي المعجم اليوم أكثر من {{ size.words.value }} معنى،
        و{{ size.entries.value }} كلمة دارجة لها في {{ size.dialects.value }} لهجة.
      </p>

      <h3 id="spelling">الكتابة والنطق</h3>
      <p>
        يسجّل «لهجة» أيَّ كلمة تقولها كل لهجة للمعنى الواحد، لا كيف تُنطق
        بالضبط. فالقطة مثلاً «بسّة» في الخليج، و«قطّوس» في تونس، و«مشّ» في
        المغرب، و«بزّونة» في العراق: كلمات مختلفة يكفي الحرف العربي لكتابتها.
      </p>
      <p>
        ويحمل كل شكل، إن أضافه أهله، كتابته بالتشكيل: «يِغَنِّج» لا «يغنج»،
        فيقرؤها من لم يسمع الكلمة قط. وقد طلب ذلك معلّمو العربية قبل غيرهم.
      </p>
      <p>
        أما ما لا تحمله الحركات، كالحركة المختلَسة الشائعة في الدارجة المغربية
        أو إمالة الياء في «بيت» الخليجية، فلا تحيط به الحروف ولا التشكيل. مكانه
        حقل للنطق بترميز صوتي، ثم تسجيلات بأصوات المتكلمين أنفسهم، وكلاهما في
        خطتنا.
      </p>
      <p>
        وتُكتب الكلمات كما يكتبها أهل اللهجة في رسائلهم ومنشوراتهم، بما في ذلك
        الحروف التي أضافوها لأصوات ليست في الفصحى: گ أو ڨ أو ݣ لصوت g، وچ لصوت
        «تش»، وڤ لصوت v. ولأن الدارجة بلا إملاء موحّد، قد تُكتب الكلمة الواحدة
        بأكثر من شكل؛ والبحث يتسامح في أشهر هذه الفروق، كالذال والدال والثاء
        والتاء.
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
        وكلمات من لهجات مصر والشام والحجاز والخليج والمغرب وتونس مأخوذة من
        <a href="https://en.wiktionary.org/" rel="noopener">ويكاموس</a>
        (Wiktionary)، عبر مستخرجات
        <a href="https://kaikki.org/dictionary/" rel="noopener">kaikki.org</a>،
        وهي مرخّصة برخصة Creative Commons BY-SA نفسها.
      </p>

      <h3 id="license">الرخصة</h3>
      <p>
        المعجم ملك لمن يتكلمون هذه اللهجات، فمحتواه كله متاح برخصة
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ar" rel="license noopener">المشاع الإبداعي: نَسب المُصنَّف - الترخيص بالمثل 4.0 (CC BY-SA 4.0)</a>.
        يحق لك أن تنسخه وتوزعه وتبني عليه لأي غرض، بشرطين: أن تنسبه إلى «لهجة»
        مع رابط إلى الموقع، وأن تنشر ما تبنيه عليه بالرخصة نفسها. والتفاصيل في
        <NuxtLink to="/terms#license">شروط الاستخدام</NuxtLink>.
        والمعجم كله للتنزيل في صفحة <NuxtLink to="/data">البيانات المفتوحة</NuxtLink>.
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

      <h3 id="more">أكثر من معجم</h3>
      <ul>
        <li><NuxtLink to="/games">الألغاز</NuxtLink>: لعبتان جديدتان كل يوم، بلا حساب: خمّن الكلمة من أشكالها في اللهجات، أو خمّن اللهجة من شكل الكلمة.</li>
        <li><NuxtLink to="/divergent">الكلمات التي تختلف عليها اللهجات أكثر</NuxtLink>: المعجم مرتباً بحسب اختلاف اللهجات على كل كلمة.</li>
      </ul>
    </section>

    <section id="join">
      <h2>انضم إلينا</h2>
      <p>
        نرحب بمساهماتكم في إثراء معجم «لهجة» بالكلمات والتعبيرات من لهجاتكم
        المحلية. كلما زادت المساهمات، أصبح المعجم أكثر شمولاً وفائدة للجميع.
      </p>

      <h3>إضافة الكلمات</h3>
      <p>
        يمكن لكل من له حساب مؤكَّد البريد أن يضيف كلمة جديدة، أو شكلاً من لهجته
        لكلمة موجودة، أو مثالاً على الاستعمال. ولكل صفحة سجلّ يحفظ تعديلاتها،
        وما يُضاف يُنشر باسم صاحبه وبرخصة المعجم نفسها.
      </p>

      <h3>الإبلاغ عن الأخطاء</h3>
      <p>
        من رأى خطأً (لهجة غير صحيحة أو كلمة تحت معنى غير معناها أو محتوى مسيئاً)
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
        من ذلك العجز وُلدت فكرة موقع يجمع كلمات كل لهجة عربية ويضعها بجانب
        كلمات اللهجات الأخرى للمعنى نفسه، حتى لا يقف أحد عاجزاً عن كلمة كما
        وقفت أنا.
      </p>
      <p>
        ثم جلست مع أعز أصدقائي، وهو رجل شديد الذكاء، سأسمّيه هنا لسان الدين،
        تيمناً بلسان الدين ابن الخطيب، وزير غرناطة وشاعرها وصديق ابن خلدون
        الأقرب. فرسمنا معاً تصوّر الموقع:
        أن تكون كل صفحة معنى واحداً تجتمع تحته كلماته في اللهجات، وأن تتصل
        الكلمات بعضها ببعض وباللهجات التي تقولها. ومن تلك الجلسات خرجت بنية
        الموقع كما ترونها اليوم.
      </p>
      <p>
        مرّت سنوات طويلة قبل أن أحوّل الفكرة إلى موقع فعلي، وها هو أخيراً بين
        أيديكم.
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
      <p>
        الكود المصدري للموقع متاح للعامة على
        <a href="https://github.com/bambozya/lahga" rel="noopener">GitHub</a>
        برخصة AGPL-3.0.
      </p>
    </section>
  </article>
</template>

<style scoped>
/* The page's whole outline, said once. A part opens under the heavy rule with
   room above it; an <h3> gets more air than a paragraph and less than a part,
   so the three levels can be told apart by the space around them alone. */
section { margin-block-start: var(--space-l); padding-block-start: var(--space-m); border-block-start: var(--rule); }
h3:not(:first-child) { margin-block-start: var(--space-m); }
/* The sentence under the title is the site's definition of itself: it is read
   as the standfirst, a step above the running text. */
h1 + p { font-size: var(--step-1); line-height: 1.7; }
/* The closing invitation of «انضم إلينا» stands apart from the paragraph before it. */
#join > p:last-child { margin-block-start: var(--space-m); }
</style>
