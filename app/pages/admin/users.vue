<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useHead({ title: 'الإدارة: الأعضاء - لهجة' })
const q = ref('')
const query = ref('')
const { data: users, refresh } = await useFetch('/api/admin/users', { query: computed(() => ({ q: query.value })) })
const fmt = (d: string | Date | null) => d ? new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(d)) : '—'
const roleLabel: Record<string, string> = { user: 'عضو', moderator: 'مشرف', admin: 'مدير' }
const busy = ref<number | null>(null)
const error = ref('')
const setBan = async (id: number, banned: boolean) => {
  const reason = banned ? (prompt('سبب الإيقاف (يظهر للمستخدم عند محاولة الدخول):') ?? '') : ''
  if (banned && !confirm('إيقاف هذا الحساب؟')) return
  busy.value = id; error.value = ''
  try { await $fetch(`/api/admin/users/${id}`, { method: 'POST', body: { banned, reason } }); await refresh() }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التنفيذ' }
  finally { busy.value = null }
}
</script>

<template>
  <article>
    <h1>الإدارة</h1>
    <AdminNav />
    <h2>الأعضاء</h2>
    <form @submit.prevent="query = q.trim()">
      <p><label for="q">بحث بالاسم أو البريد</label> <input id="q" v-model="q" /> <button type="submit">بحث</button></p>
    </form>
    <p role="alert" v-if="error">{{ error }}</p>
    <div style="overflow-x: auto">
      <table>
        <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>انضم</th><th>آخر دخول</th><th>الحالة</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><NuxtLink v-if="!u.deleted" :to="`/u/${u.id}`">{{ u.displayName }}</NuxtLink><template v-else>{{ u.displayName }}</template></td>
            <td dir="ltr">{{ u.deleted ? '—' : u.email }}</td>
            <td>{{ roleLabel[u.role] }}</td>
            <td><time :datetime="String(u.createdAt)">{{ fmt(u.createdAt) }}</time></td>
            <td>{{ fmt(u.lastSeenAt) }}</td>
            <td>
              <template v-if="u.deleted">محذوف</template>
              <template v-else-if="u.bannedAt">موقوف<small v-if="u.banReason">: {{ u.banReason }}</small></template>
              <template v-else-if="!u.verified">غير مؤكد</template>
              <template v-else>نشط</template>
            </td>
            <td>
              <template v-if="!u.deleted && u.role !== 'admin'">
                <button v-if="u.bannedAt" type="button" :disabled="busy === u.id" @click="setBan(u.id, false)">إلغاء الإيقاف</button>
                <button v-else type="button" :disabled="busy === u.id" @click="setBan(u.id, true)">إيقاف</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
