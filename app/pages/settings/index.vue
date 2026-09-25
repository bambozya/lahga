<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeo({ title: 'الإعدادات', noindex: true })
const route = useRoute()
const { user, fetch: refresh, clear } = useUserSession()
const { data: me, refresh: reload } = await useFetch('/api/me')
const { data: myProposals } = await useFetch('/api/me/proposals')
const proposalStatus: Record<string, string> = { pending: 'قيد المراجعة', approved: 'قُبل', rejected: 'رُفض' }

const profile = reactive({ displayName: me.value?.displayName ?? '', bio: me.value?.bio ?? '' })
const profileSaved = ref(false)
const saveProfile = useForm(async () => {
  await $fetch('/api/me', { method: 'PATCH', body: profile })
  await Promise.all([refresh(), reload()])
  profileSaved.value = true
})

const pw = reactive({ current: '', password: '' })
const pwSaved = ref(false)
const savePassword = useForm(async () => {
  await $fetch('/api/me/password', { method: 'PATCH', body: pw })
  pw.current = ''; pw.password = ''
  await reload()
  pwSaved.value = true
})

const resent = ref(false)
const resend = useForm(async () => {
  await $fetch('/api/auth/resend', { method: 'POST' })
  resent.value = true
})

const logout = async () => { await clear(); await navigateTo('/') }

const confirmDelete = ref('')
const deletePassword = ref('')
const remove = useForm(async () => {
  await $fetch('/api/me', { method: 'DELETE', body: { password: deletePassword.value } })
  await clear()
  await navigateTo('/?deleted=1')
})
</script>

<template>
  <article v-if="me">
    <BreadCrumbs :trail="[{ label: 'الإعدادات' }]" />
    <h1>الإعدادات</h1>
    <p role="status" v-if="route.query.welcome">أهلاً بك! اختر اسماً بالحروف العربية يظهر بجانب مساهماتك.</p>
    <p role="status" v-else-if="route.query.reset">تم تغيير كلمة المرور وتسجيل دخولك.</p>

    <section>
      <h2>الحساب</h2>
      <p>البريد الإلكتروني: <span dir="ltr">{{ me.email }}</span></p>
      <template v-if="!me.emailVerified">
        <p role="alert">بريدك غير مؤكد بعد. لا يمكنك إضافة الكلمات قبل تأكيده.</p>
        <p v-if="resent" role="status">أرسلنا رابطاً جديداً إلى بريدك.</p>
        <p v-else><button type="button" :disabled="resend.busy.value" @click="resend.run">أرسل رابط التأكيد مجدداً</button></p>
      </template>
      <p v-if="me.providers.length">حسابات مرتبطة: {{ me.providers.map(p => p === 'google' ? 'Google' : p).join('، ') }}</p>
      <p><button type="button" @click="logout">تسجيل الخروج</button></p>
    </section>

    <section>
      <h2>الملف الشخصي</h2>
      <p role="alert" v-if="saveProfile.error.value">{{ saveProfile.error.value }}</p>
      <p role="status" v-else-if="profileSaved">تم الحفظ.</p>
      <form @submit.prevent="profileSaved = false; saveProfile.run()">
        <fieldset :disabled="saveProfile.busy.value">
          <legend>ما يراه الآخرون</legend>
          <p>
            <label for="name">الاسم الظاهر</label>
            <input id="name" v-model="profile.displayName" required minlength="2" maxlength="40" />
          </p>
          <p>
            <label for="bio">نبذة</label>
            <textarea id="bio" v-model="profile.bio" maxlength="300" rows="3"></textarea>
            <small>اختيارية. من أين لهجتك؟ ما الذي يهمك في الكلمات؟</small>
          </p>
          <p><button type="submit">حفظ</button> <NuxtLink :to="`/u/${me.id}`">عرض صفحتي العامة</NuxtLink></p>
        </fieldset>
      </form>
    </section>

    <section v-if="myProposals?.length">
      <h2>اقتراحاتي</h2>
      <ul>
        <li v-for="p in myProposals" :key="p.id">
          <template v-if="p.dialect">وصف <NuxtLink :to="`/d/${p.dialect.slug}`">{{ p.dialect.nameAr }}</NuxtLink></template><template v-else>{{ p.kind }}</template>:
          <b>{{ proposalStatus[p.status] }}</b><small v-if="p.note"> · {{ p.note }}</small>
        </li>
      </ul>
    </section>

    <section>
      <h2>كلمة المرور</h2>
      <p role="alert" v-if="savePassword.error.value">{{ savePassword.error.value }}</p>
      <p role="status" v-else-if="pwSaved">تم تغيير كلمة المرور.</p>
      <form @submit.prevent="pwSaved = false; savePassword.run()">
        <fieldset :disabled="savePassword.busy.value">
          <legend>{{ me.hasPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور' }}</legend>
          <p v-if="!me.hasPassword"><small>دخلت بحساب Google. بكلمة مرور يمكنك الدخول بالبريد أيضاً.</small></p>
          <p v-if="me.hasPassword">
            <label for="current">كلمة المرور الحالية</label>
            <input id="current" v-model="pw.current" type="password" autocomplete="current-password" required dir="ltr" />
          </p>
          <p>
            <label for="new">كلمة المرور الجديدة</label>
            <input id="new" v-model="pw.password" type="password" autocomplete="new-password" required minlength="8" dir="ltr" />
          </p>
          <p><button type="submit">حفظ</button></p>
        </fieldset>
      </form>
    </section>

    <section>
      <h2>حذف الحساب</h2>
      <p>يُحذف بريدك واسمك وكل بياناتك الشخصية نهائياً. ما أضفته من كلمات يبقى منسوباً إلى «مستخدم محذوف» حتى لا تُحذف مساهمات الآخرين المبنية عليه.</p>
      <p role="alert" v-if="remove.error.value">{{ remove.error.value }}</p>
      <form @submit.prevent="remove.run">
        <fieldset :disabled="remove.busy.value">
          <legend>تأكيد الحذف</legend>
          <p v-if="me.hasPassword">
            <label for="delpw">كلمة المرور</label>
            <input id="delpw" v-model="deletePassword" type="password" autocomplete="current-password" required dir="ltr" />
          </p>
          <p>
            <label for="confirm">اكتب «احذف حسابي» للتأكيد</label>
            <input id="confirm" v-model="confirmDelete" required />
          </p>
          <p><button type="submit" :disabled="confirmDelete.trim() !== 'احذف حسابي'">احذف حسابي نهائياً</button></p>
        </fieldset>
      </form>
    </section>
  </article>
</template>
