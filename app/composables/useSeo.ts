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
  /**
   * Absolute or root-relative path to a preview image; defaults to the
   * generic 1200×630 /og.png. A word or dialect card (/og/w/[id].png,
   * /og/d/[slug].png — docs/REACH.md, Phase R2) is portrait, 1080×1350, so
   * `og:image:width`/`height` switch with it — a wrong aspect ratio in those
   * tags is worse than not sending them, since some crawlers lay out the
   * preview from the declared size before the image itself ever loads.
   */
  image?: MaybeGetter<string | undefined>
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
  const image = computed(() => {
    const img = read(options.image)
    if (!img) return { url: `${site}/og.png`, width: 1200, height: 630 }
    return { url: img.startsWith('http') ? img : site + img, width: 1080, height: 1350 }
  })

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
        { property: 'og:image', content: image.value.url },
        { property: 'og:image:width', content: String(image.value.width) },
        { property: 'og:image:height', content: String(image.value.height) },
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
