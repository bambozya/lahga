<script setup lang="ts">
// Sharing a game's result, the same way for every game (docs/ROADMAP.md B3):
// a real share sheet with the result card attached where the browser can share
// files, else the result line through the share sheet, else copied. The card
// stays on the page either way, and the download link saves it by hand —
// WhatsApp, where this actually travels, moves pictures.
const props = defineProps<{
  /** The result card, e.g. /og/daily-result.png?… */
  cardUrl: string
  /** File name for the shared and downloaded image. */
  fileName: string
  /** The spoiler-free result line. */
  text: string
}>()

const shared = ref(false)
const share = async () => {
  try {
    if (typeof navigator.canShare === 'function' && props.cardUrl) {
      const blob = await $fetch<Blob>(props.cardUrl, { responseType: 'blob' })
      const file = new File([blob], props.fileName, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: props.text })
        shared.value = true
        return
      }
    }
    if (navigator.share) await navigator.share({ text: props.text })
    else await navigator.clipboard.writeText(props.text)
    shared.value = true
  } catch { /* the visitor cancelled the share sheet — not a failure */ }
}
</script>

<template>
  <button type="button" @click="share">{{ shared ? 'تم' : 'شارك النتيجة' }}</button>
  <a v-if="cardUrl" :href="cardUrl" :download="fileName" class="cta">نزّل الصورة</a>
</template>
