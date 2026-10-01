/**
 * The dictionary's size as a sentence can say it: the counts from the
 * hourly-cached export (/api/data-meta), rounded down to two significant
 * figures so the text reads "more than 2,000" and stays true between builds.
 * `ready` is false when the counts are missing or too small to round (a fresh
 * local database); callers fall back to wording without numbers.
 *
 * Not awaited on purpose: useFetch still finishes before the server renders
 * the component, so the numbers are in the HTML a crawler reads, and every
 * caller shares the one request under the same key.
 */
export function useDictionarySize() {
  const { data } = useFetch('/api/data-meta', { key: 'data-meta-size', pick: ['words', 'entries', 'dialects'] })
  const fmt = new Intl.NumberFormat('ar')
  const roughly = (n: number) => {
    const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1)
    return fmt.format(Math.floor(n / step) * step)
  }
  const ready = computed(() => (data.value?.words ?? 0) >= 100 && !!data.value?.entries)
  return {
    ready,
    words: computed(() => ready.value ? roughly(data.value!.words) : ''),
    entries: computed(() => ready.value ? roughly(data.value!.entries) : ''),
    // Dialects are few enough to count exactly.
    dialects: computed(() => ready.value && data.value!.dialects ? fmt.format(data.value!.dialects) : ''),
  }
}
