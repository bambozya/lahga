/**
 * The one pattern every account form uses: submit, show the server's message,
 * disable the button meanwhile. Errors from the API arrive as statusMessage in Arabic.
 */
export function useForm<T>(submit: () => Promise<T>) {
  const busy = ref(false)
  const error = ref('')
  const run = async () => {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      return await submit()
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || 'حدث خطأ غير متوقع'
    } finally {
      busy.value = false
    }
  }
  return { busy, error, run }
}
