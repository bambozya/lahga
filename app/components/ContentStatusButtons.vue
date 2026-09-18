<script setup lang="ts">
/** Admin controls on one content row: hide, restore, delete. */
const props = defineProps<{ type: 'word' | 'entry' | 'link' | 'example', id: number, status: string }>()
const emit = defineEmits<{ changed: [] }>()
const busy = ref(false)
const error = ref('')
const set = async (status: 'active' | 'hidden' | 'deleted') => {
  const reason = status === 'active' ? '' : (prompt('السبب (اختياري):') ?? '')
  busy.value = true; error.value = ''
  try { await $fetch(`/api/admin/content/${props.type}/${props.id}`, { method: 'POST', body: { status, reason } }); emit('changed') }
  catch (e: any) { error.value = e?.data?.statusMessage || 'تعذر التنفيذ' }
  finally { busy.value = false }
}
</script>

<template>
  <small>
    <button v-if="status !== 'hidden'" type="button" :disabled="busy" @click="set('hidden')">إخفاء</button>
    <button v-if="status !== 'active'" type="button" :disabled="busy" @click="set('active')">إعادة</button>
    <button v-if="status !== 'deleted'" type="button" :disabled="busy" @click="set('deleted')">حذف</button>
    <span v-if="error" role="alert">{{ error }}</span>
  </small>
</template>

<style scoped>
button { padding: 0 0.6em; min-height: 1.8rem; margin-inline-end: 0.3em; }
</style>
