<template>
  <div class="about-view">
    <div class="about-container">
      <h1 class="about-title">عن موقع لهجة</h1>

      <section class="about-section">
        <h2 class="section-title">ما هو موقع لهجة؟</h2>
        <p>
          موقع "لهجة" هو منصة تفاعلية مخصصة لتوثيق وتبادل المفردات والتعبيرات من
          مختلف اللهجات العربية. يهدف الموقع إلى إنشاء قاموس شامل للهجات العربية
          المتنوعة، وربط الكلمات التي تحمل نفس المعنى في لهجات مختلفة.
        </p>
        <p>
          تم تصميم الموقع ليكون سهل الاستخدام ويشجع المستخدمين على المشاركة
          بإضافة كلمات من لهجاتهم المحلية، والتصويت على الكلمات الموجودة، والبحث
          عن معاني الكلمات التي يسمعونها في لهجات أخرى.
        </p>
      </section>

      <section class="about-section">
        <h2 class="section-title">رؤيتنا</h2>
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

      <section class="about-section">
        <h2 class="section-title">كيف يعمل الموقع؟</h2>
        <div class="features">
          <div class="feature-item">
            <h3 class="feature-title">إضافة الكلمات</h3>
            <p>
              يمكن لأي مستخدم مسجل إضافة كلمات جديدة إلى القاموس، مع تحديد
              اللهجة والمعنى وإضافة أمثلة على الاستخدام.
            </p>
          </div>

          <div class="feature-item">
            <h3 class="feature-title">التصويت</h3>
            <p>
              يمكن للمستخدمين التصويت إيجاباً أو سلباً على الكلمات، مما يساعد في
              تحديد أكثر التعريفات دقة وشيوعاً.
            </p>
          </div>

          <div class="feature-item">
            <h3 class="feature-title">البحث والتصفح</h3>
            <p>
              يمكن البحث عن الكلمات حسب اللهجة أو المعنى، وتصفح الكلمات الأكثر
              شيوعاً أو الأحدث إضافة.
            </p>
          </div>

          <div class="feature-item">
            <h3 class="feature-title">ربط اللهجات</h3>
            <p>
              يتم ربط الكلمات التي تحمل نفس المعنى في لهجات مختلفة، مما يسهل فهم
              التنوع اللغوي بين اللهجات العربية.
            </p>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2 class="section-title">اللهجات المدعومة</h2>
        <p>حالياً، يدعم موقع "لهجة" اللهجات العربية التالية:</p>
        <ul class="dialects-list">
          <li>اللهجة المصرية</li>
          <li>اللهجة الشامية (سوريا، لبنان، فلسطين، الأردن)</li>
          <li>
            اللهجة الخليجية (السعودية، الإمارات، قطر، البحرين، الكويت، عمان)
          </li>
          <li>اللهجة المغاربية (المغرب، الجزائر، تونس، ليبيا)</li>
          <li>اللهجة العراقية</li>
          <li>اللهجة اليمنية</li>
          <li>اللهجة السودانية</li>
        </ul>
        <p>ونخطط لإضافة المزيد من اللهجات في المستقبل.</p>
      </section>

      <section class="about-section">
        <h2 class="section-title">انضم إلينا</h2>
        <p>
          نرحب بمساهماتكم في إثراء قاموس "لهجة" بالكلمات والتعبيرات من لهجاتكم
          المحلية. كلما زادت المساهمات، أصبح القاموس أكثر شمولاً وفائدة للجميع.
        </p>
        <div class="cta-buttons">
          <NuxtLink to="/browse" class="cta-button primary"
            >تصفح الكلمات</NuxtLink
          >
          <NuxtLink to="/contact" class="cta-button secondary"
            >اقترح كلمة</NuxtLink
          >
        </div>
      </section>

      <section class="about-section">
        <h2 class="section-title">تواصل معنا</h2>
        <p>
          إذا كان لديك أي اقتراحات أو استفسارات، أو ترغب في المساهمة في تطوير
          الموقع، يمكنك التواصل معنا عبر:
        </p>
        <div class="contact-info">
          <p>
            البريد الإلكتروني:
            <a href="mailto:info@lahga.com">info@lahga.com</a>
          </p>
          <p>
            أو من خلال <NuxtLink to="/contact">نموذج الاتصال</NuxtLink>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about-view {
  padding-bottom: 2rem;
}

.about-container {
  background-color: var(--card-background);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: var(--shadow);
}

.about-title {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--primary-color);
}

.about-section {
  margin-bottom: 3rem;
}

.section-title {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: var(--step-3);
}

.about-section p {
  margin-bottom: 1rem;
  line-height: 1.7;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.feature-item {
  background-color: var(--background-color);
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.feature-title {
  color: var(--primary-color);
  margin-bottom: 0.8rem;
  font-size: var(--step-1);
}

.dialects-list {
  padding-right: 1.5rem;
  margin: 1rem 0;
}

.dialects-list li {
  margin-bottom: 0.5rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cta-button {
  display: inline-block;
  padding: 0.8rem 1.5rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
}

.cta-button.primary {
  background-color: var(--primary-color);
  color: white;
}

.cta-button.primary:hover {
  background-color: var(--primary-dark);
}

.cta-button.secondary {
  background-color: var(--background-color);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.cta-button.secondary:hover {
  background-color: rgba(74, 111, 165, 0.1);
}

.contact-info {
  margin-top: 1rem;
}

.contact-info p {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .about-container {
    padding: 1.5rem;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .cta-buttons {
    flex-direction: column;
  }

  .cta-button {
    text-align: center;
  }
}
</style>
