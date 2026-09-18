/**
 * One place for what search engines and social cards read: title, description,
 * canonical URL, Open Graph, and optional structured data (JSON-LD).
 *
 * Call it once per page. Values may be refs or getters, so pages that load
 * their data with useFetch can pass `() => word.value?.headword`.
 */
type MaybeGetter<T> = T | (() => T)

export interface SeoOptions {
  /** Page title without the site name; the site name is appended. */
  title: MaybeGetter<string | undefined>
  /** One or two sentences. Search results show roughly 160 characters. */
  description?: MaybeGetter<string | undefined>
  /** Path only, e.g. `/w/12`. Defaults to the current route without its query. */
  path?: MaybeGetter<string | undefined>
  /** Keep the page out of search results (account pages, admin, search results). */
  noindex?: MaybeGetter<boolean | undefined>
  /** Structured data objects; each becomes one <script type="application/ld+json">. */
  jsonLd?: MaybeGetter<Record<string, unknown> | Record<string, unknown>[] | undefined>
}

const SITE_NAME = 'لهجة'
const read = <T>(v: MaybeGetter<T>): T => (typeof v === 'function' ? (v as () => T)() : v)

/** Trims to a whole word near the limit, so descriptions never end mid-word. */
export function clampText(text: string | undefined, max = 160): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

export function useSeo(options: SeoOptions) {
  const route = useRoute()
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const url = computed(() => site + (read(options.path) ?? route.path))
  const title = computed(() => {
    const t = read(options.title)
    return t ? `${t} - ${SITE_NAME}` : SITE_NAME
  })
  const description = computed(() => clampText(read(options.description)))

  useHead(() => {
    const ld = read(options.jsonLd)
    const blocks = (Array.isArray(ld) ? ld : ld ? [ld] : [])
    return {
      title: title.value,
      link: [{ rel: 'canonical', href: url.value }],
      meta: [
        ...(description.value ? [{ name: 'description', content: description.value }] : []),
        ...(read(options.noindex) ? [{ name: 'robots', content: 'noindex, follow' }] : []),
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:locale', content: 'ar_AR' },
        { property: 'og:title', content: title.value },
        { property: 'og:url', content: url.value },
        { property: 'og:image', content: `${site}/og.png` },
        ...(description.value ? [{ property: 'og:description', content: description.value }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      script: blocks.map((block, i) => ({
        key: `ld-${i}`,
        type: 'application/ld+json',
        // "<" is escaped so a stray tag in the data cannot close the script element.
        innerHTML: JSON.stringify(block).replace(/</g, '\\u003c'),
      })),
    }
  })
}
