<script setup>
import { ref } from "vue";

const name = ref("");
const email = ref("");
const subject = ref("");
const message = ref("");
const errors = ref({});
const loading = ref(false);
const submitSuccess = ref(false);

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!name.value.trim()) {
    errors.value.name = "الرجاء إدخال الاسم";
    isValid = false;
  }

  if (!email.value.trim()) {
    errors.value.email = "الرجاء إدخال البريد الإلكتروني";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email.value)) {
    errors.value.email = "الرجاء إدخال بريد إلكتروني صحيح";
    isValid = false;
  }

  if (!subject.value.trim()) {
    errors.value.subject = "الرجاء إدخال الموضوع";
    isValid = false;
  }

  if (!message.value.trim()) {
    errors.value.message = "الرجاء إدخال الرسالة";
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    // In a real application, you would send the form data to a server
    // For now, we'll just simulate a successful submission after a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Reset form
    name.value = "";
    email.value = "";
    subject.value = "";
    message.value = "";

    submitSuccess.value = true;

    // Hide success message after 5 seconds
    setTimeout(() => {
      submitSuccess.value = false;
    }, 5000);
  } catch (error) {
    console.error("Error submitting form:", error);
    errors.value.submit =
      "حدث خطأ أثناء إرسال النموذج. الرجاء المحاولة مرة أخرى.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="contact-view">
    <h1 class="page-title">اتصل بنا</h1>

    <div class="contact-container">
      <div class="contact-info">
        <h2 class="section-title">معلومات الاتصال</h2>
        <p>
          نحن نرحب بأسئلتكم واقتراحاتكم وملاحظاتكم. يمكنكم التواصل معنا من خلال
          النموذج المرفق أو عبر:
        </p>

        <div class="info-item">
          <h3>البريد الإلكتروني</h3>
          <p><a href="mailto:info@lahga.com">info@lahga.com</a></p>
        </div>

        <div class="info-item">
          <h3>وسائل التواصل الاجتماعي</h3>
          <div class="social-links">
            <a href="#" class="social-link">تويتر</a>
            <a href="#" class="social-link">فيسبوك</a>
            <a href="#" class="social-link">انستغرام</a>
          </div>
        </div>

        <div class="info-item">
          <h3>ساعات الرد</h3>
          <p>نحن نسعى للرد على جميع الاستفسارات خلال 24-48 ساعة عمل.</p>
        </div>
      </div>

      <div class="contact-form-container">
        <h2 class="section-title">نموذج الاتصال</h2>

        <div v-if="submitSuccess" class="success-message">
          <p>تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.</p>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="contact-form">
          <div v-if="errors.submit" class="submit-error">
            {{ errors.submit }}
          </div>

          <div class="form-group">
            <label for="name" class="form-label">الاسم *</label>
            <input
              type="text"
              id="name"
              v-model="name"
              class="form-input"
              :class="{ error: errors.name }"
              placeholder="أدخل اسمك"
            />
            <span v-if="errors.name" class="error-message">{{
              errors.name
            }}</span>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">البريد الإلكتروني *</label>
            <input
              type="email"
              id="email"
              v-model="email"
              class="form-input"
              :class="{ error: errors.email }"
              placeholder="أدخل بريدك الإلكتروني"
            />
            <span v-if="errors.email" class="error-message">{{
              errors.email
            }}</span>
          </div>

          <div class="form-group">
            <label for="subject" class="form-label">الموضوع *</label>
            <input
              type="text"
              id="subject"
              v-model="subject"
              class="form-input"
              :class="{ error: errors.subject }"
              placeholder="أدخل موضوع الرسالة"
            />
            <span v-if="errors.subject" class="error-message">{{
              errors.subject
            }}</span>
          </div>

          <div class="form-group">
            <label for="message" class="form-label">الرسالة *</label>
            <textarea
              id="message"
              v-model="message"
              class="form-textarea"
              :class="{ error: errors.message }"
              placeholder="أدخل رسالتك هنا"
              rows="6"
            ></textarea>
            <span v-if="errors.message" class="error-message">{{
              errors.message
            }}</span>
          </div>

          <div class="form-actions">
            <button type="submit" class="submit-button" :disabled="loading">
              <span v-if="loading">جاري الإرسال...</span>
              <span v-else>إرسال الرسالة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-view {
  padding-bottom: 2rem;
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--primary-color);
}

.contact-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
}

.contact-info,
.contact-form-container {
  background-color: var(--card-background);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: var(--shadow);
}

.section-title {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.info-item {
  margin-bottom: 1.5rem;
}

.info-item h3 {
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-size: 1.1rem;
}

.info-item p {
  color: var(--light-text);
  line-height: 1.5;
}

.social-links {
  display: flex;
  gap: 1rem;
}

.social-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.3s;
}

.social-link:hover {
  color: var(--secondary-color);
}

.success-message {
  background-color: rgba(76, 175, 80, 0.1);
  color: var(--success-color);
  padding: 1.5rem;
  border-radius: 0.5rem;
  text-align: center;
  font-size: 1.1rem;
}

.submit-error {
  background-color: rgba(244, 67, 54, 0.1);
  color: var(--error-color);
  padding: 1rem;
  border-radius: 0.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-size: 1rem;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 111, 165, 0.2);
}

.form-input.error,
.form-textarea.error {
  border-color: var(--error-color);
}

.error-message {
  display: block;
  color: var(--error-color);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.form-actions {
  margin-top: 2rem;
}

.submit-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 0.25rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-button:hover:not(:disabled) {
  background-color: #3a5a84;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .contact-container {
    grid-template-columns: 1fr;
  }

  .contact-info,
  .contact-form-container {
    padding: 1.5rem;
  }
}
</style>
