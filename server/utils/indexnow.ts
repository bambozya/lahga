import { and, gt, inArray, eq } from 'drizzle-orm'
import { useDb, schema } from '../db'

/**
 * IndexNow (docs/DISCOVERY.md): tells Bing, and through it the answer engines
 * built on Bing's index, which pages changed, within minutes instead of
 * whenever the sitemap is next crawled. Google does not take part.
 *
 * Nothing here knows what a request changed. The revisions table does: every
 * create and edit writes one row, so a flush asks it for what changed since
 * the last flush, follows entries and examples up to their words, and submits
 * those word pages plus the dialect pages they sit on. A deleted word is
 * submitted too — the crawler finds the 404 and drops the page sooner.
 *
 * Without NUXT_INDEXNOW_KEY this is entirely inert. The key is served at
 * /indexnow/<key>.txt (server/routes/indexnow/[key].txt.get.ts), which is the
 * proof of ownership IndexNow asks for.
 */
const ENDPOINT = 'https://api.indexnow.org/indexnow'
/** Changes are collected for a minute, so an import of a hundred words is one call, not a hundred. */
const DEBOUNCE_MS = 60_000
/** The protocol's ceiling per call. */
const MAX_URLS = 10_000

let timer: ReturnType<typeof setTimeout> | undefined
// On first use, look a little way back so a change made just before the
// process started is not lost.
let since = new Date(Date.now() - 15 * 60_000)

export function indexNowEnabled(): boolean {
  return !!useRuntimeConfig().indexnowKey
}

/** Called after any content change; the actual work happens once things go quiet. */
export function scheduleIndexNow() {
  if (!indexNowEnabled()) return
  if (timer) return
  timer = setTimeout(() => {
    timer = undefined
    flushIndexNow().catch(err => console.warn('[indexnow]', err?.message ?? err))
  }, DEBOUNCE_MS)
}

/** The word slugs and dialect slugs touched by revisions written after `from`. */
export async function changedSince(from: Date): Promise<{ words: string[], dialects: string[] }> {
  const db = await useDb()
  const revs = await db.select({ targetType: schema.revisions.targetType, targetId: schema.revisions.targetId })
    .from(schema.revisions).where(gt(schema.revisions.createdAt, from))
  if (!revs.length) return { words: [], dialects: [] }

  const ids = (t: string) => revs.filter(r => r.targetType === t).map(r => r.targetId)
  const wordIds = new Set(ids('word'))
  const entryIds = new Set(ids('entry'))

  const exampleIds = ids('example')
  if (exampleIds.length) {
    const rows = await db.select({ entryId: schema.examples.entryId }).from(schema.examples).where(inArray(schema.examples.id, exampleIds))
    rows.forEach(r => entryIds.add(r.entryId))
  }
  const linkIds = ids('link')
  if (linkIds.length) {
    const rows = await db.select({ wordId: schema.wordEntryLinks.wordId, entryId: schema.wordEntryLinks.entryId })
      .from(schema.wordEntryLinks).where(inArray(schema.wordEntryLinks.id, linkIds))
    rows.forEach((r) => { wordIds.add(r.wordId); entryIds.add(r.entryId) })
  }
  const dialectIds = new Set<number>()
  if (entryIds.size) {
    const list = [...entryIds]
    const [links, entries] = await Promise.all([
      db.select({ wordId: schema.wordEntryLinks.wordId }).from(schema.wordEntryLinks)
        .where(and(inArray(schema.wordEntryLinks.entryId, list), eq(schema.wordEntryLinks.status, 'active'))),
      db.select({ dialectId: schema.entries.dialectId }).from(schema.entries).where(inArray(schema.entries.id, list)),
    ])
    links.forEach(l => wordIds.add(l.wordId))
    entries.forEach(e => dialectIds.add(e.dialectId))
  }

  const [words, dialects] = await Promise.all([
    wordIds.size
      ? db.select({ slug: schema.words.slug }).from(schema.words).where(inArray(schema.words.id, [...wordIds]))
      : [],
    dialectIds.size
      ? db.select({ slug: schema.dialects.slug }).from(schema.dialects).where(inArray(schema.dialects.id, [...dialectIds]))
      : [],
  ])
  return {
    words: words.map(w => w.slug).filter((s): s is string => !!s),
    dialects: dialects.map(d => d.slug),
  }
}

/** Submits what changed since the last flush. Returns how many URLs went out. */
export async function flushIndexNow(): Promise<number> {
  const key = useRuntimeConfig().indexnowKey
  if (!key) return 0
  const from = since
  since = new Date()
  const changed = await changedSince(from)
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const urls = [
    ...changed.words.map(s => `${site}/w/${encodeURIComponent(s)}`),
    ...changed.dialects.map(s => `${site}/d/${s}`),
  ].slice(0, MAX_URLS)
  if (!urls.length) return 0
  await submitIndexNow(urls)
  return urls.length
}

/** One call to the shared endpoint; it fans out to every engine in the scheme. */
export async function submitIndexNow(urlList: string[]) {
  const key = useRuntimeConfig().indexnowKey
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const host = new URL(site).host
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${site}/indexnow/${key}.txt`, urlList }),
    signal: AbortSignal.timeout(10_000),
  })
  // 200 and 202 both mean accepted; anything else is worth a line in the log.
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow answered ${res.status}`)
}
