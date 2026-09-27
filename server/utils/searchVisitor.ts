import type { H3Event } from 'h3'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lt, sql } from 'drizzle-orm'
import { isbotMatch } from 'isbot'
import { Reader } from 'mmdb-lib'
import type { Db } from '../db'
import { schema } from '../db'

/**
 * Who searched for a word that is not in the dictionary: everything the request
 * itself tells us, without a cookie and without keeping the IP address.
 *
 * Three ways a search reaches /api/words, told apart as `via`:
 *
 *   app   typed into the running page. Its script adds two headers of ours
 *         (time zone and the site the visitor arrived from), which only a
 *         browser that ran the page can send, so this is the surest sign of a
 *         person.
 *   page  a /?q= URL loaded whole: a shared link, a reload, a crawler. The page
 *         is rendered on the server, and there the request the API sees is not
 *         the visitor's: the rendered-page cache (routeRules `swr`) strips every
 *         header before rendering, the IP included. So middleware/search-visit.ts
 *         notes the real request under a random id first, the page passes that
 *         id along (VISIT_HEADER), and the facts are read back from it here. The
 *         id never leaves the server, so nobody can send one they were not given.
 *   api   neither: something calling the API directly.
 */

export const VISIT_HEADER = 'x-lahga-visit'
export const TZ_HEADER = 'x-lahga-tz'
export const FROM_HEADER = 'x-lahga-from'

/** The parts of a request the log is built from, read before the IP is dropped. */
type RequestFacts = {
  ip: string
  ua: string
  lang: string | null
  referrer: string | null
  secFetch: boolean
  chMobile: boolean
  chPlatform: string | null
  signedIn: boolean
}

function readRequestFacts(event: H3Event): RequestFacts {
  const h = (name: string) => getRequestHeader(event, name) ?? ''
  return {
    ip: getRequestIP(event, { xForwardedFor: true }) || '',
    ua: h('user-agent').slice(0, 500),
    lang: firstLanguage(h('accept-language')),
    referrer: hostOf(h('referer')),
    // Every current browser sends these on every request; most scripts do not.
    secFetch: !!h('sec-fetch-mode'),
    chMobile: h('sec-ch-ua-mobile') === '?1',
    chPlatform: h('sec-ch-ua-platform').replace(/"/g, '').slice(0, 30) || null,
    // Only a signed-in visitor has the session cookie (plugins/anonymous-no-cookie.ts).
    // Whether they are signed in is all that is kept, never who they are.
    signedIn: !!getCookie(event, 'nuxt-session'),
  }
}

// ---------- page visits handed from the middleware to the API ----------

const VISIT_TTL_MS = 60_000
const visits = new Map<string, { facts: RequestFacts, expires: number }>()

/** Called by middleware/search-visit.ts on the visitor's own request for /?q=. */
export function rememberPageVisit(event: H3Event): string {
  const now = Date.now()
  if (visits.size > 1000) {
    for (const [id, v] of visits) if (v.expires < now) visits.delete(id)
    // Still full: a flood of fresh visits. The oldest go first (a Map keeps insertion order).
    for (const id of visits.keys()) { if (visits.size <= 1000) break; visits.delete(id) }
  }
  const id = randomUUID()
  visits.set(id, { facts: readRequestFacts(event), expires: now + VISIT_TTL_MS })
  return id
}

function pageVisit(event: H3Event): RequestFacts | undefined {
  const id = getRequestHeader(event, VISIT_HEADER)
  if (!id) return
  const v = visits.get(id)
  return v && v.expires > Date.now() ? v.facts : undefined
}

/** The visitor's IP for a server-rendered search, which the render itself no longer carries. */
export function pageVisitIp(event: H3Event): string | undefined {
  return pageVisit(event)?.ip || undefined
}

// ---------- the facts kept for one miss ----------

export type SearcherFacts = Omit<typeof schema.searchMissEvents.$inferInsert, 'id' | 'missId' | 'at'>

export function describeSearcher(event: H3Event): SearcherFacts {
  const visit = pageVisit(event)
  const own = visit ? undefined : readRequestFacts(event)
  const r = visit ?? own!
  const timezone = visit ? null : timeZoneOf(getRequestHeader(event, TZ_HEADER))
  const via = visit ? 'page' : timezone ? 'app' : 'api'
  // In the running page the Referer is our own page; the page's script sends
  // where the visitor came from instead (document.referrer).
  const referrer = via === 'app' ? hostOf(`https://${getRequestHeader(event, FROM_HEADER) ?? ''}`) : r.referrer

  const geo = lookup(r.ip)
  const visitor = r.ip ? dailyHash(r.ip, r.ua) : null
  const botName = r.ua ? isbotMatch(r.ua) : null
  const ua = parseUserAgent(r.ua, r.chMobile, r.chPlatform)

  return {
    country: geo.country,
    asn: geo.asn,
    network: geo.network,
    visitor,
    device: botName ? null : ua.device,
    os: ua.os,
    browser: botName ? botName.slice(0, 40) : ua.browser,
    lang: r.lang,
    timezone,
    referrer,
    via,
    signedIn: r.signedIn,
    bot: botReason({ via, botName, r, asn: geo.asn, network: geo.network, visitor }),
  }
}

/**
 * Why a search looks automated, or null when it looks like a person. The first
 * reason that applies wins. None of these is proof: they catch crawlers that say
 * what they are and cheap scripts, not a bot that imitates a browser well.
 */
function botReason(a: { via: string, botName: string | null, r: RequestFacts, asn: number | null, network: string | null, visitor: string | null }) {
  if (a.botName) return 'declared' // the user agent says it is a bot
  if (!a.r.ua) return 'no-ua'
  if (!a.r.lang || !a.r.secFetch) return 'no-browser' // missing headers every browser sends
  // A cloud network is where crawlers live, but also where many VPNs exit, and
  // VPNs are common in the region this dictionary is for. A search typed into the
  // running page is a person's however it travelled, so it is not held against it.
  if (a.via !== 'app' && isDataCentre(a.asn, a.network)) return 'datacenter'
  if (a.visitor && isBurst(a.visitor)) return 'burst'
  return null
}

// ---------- IP → country and network ----------

type CountryRecord = { country_code?: string }
type AsnRecord = { autonomous_system_number?: number, autonomous_system_organization?: string }

// mmdb-lib types its records as MaxMind's own layouts; these files use simpler ones.
let readers: { country?: Reader<any>, asn?: Reader<any> } | undefined

/** Opens the databases scripts/fetch-geo.mjs downloads, once. Missing files mean no lookup, not an error. */
function geoReaders() {
  if (readers) return readers
  readers = {}
  const dir = resolve(process.cwd(), '.data/geo')
  try { readers.country = new Reader(readFileSync(`${dir}/user-country.mmdb`)) } catch {}
  try { readers.asn = new Reader(readFileSync(`${dir}/origin-asn.mmdb`)) } catch {}
  if (!readers.country) console.warn('[lahga] no IP country database; run `npm run geo`')
  return readers
}

function lookup(ip: string) {
  const none = { country: null, asn: null, network: null }
  if (!ip) return none
  try {
    const { country, asn } = geoReaders()
    const c = country?.get(ip) as CountryRecord | null | undefined
    const a = asn?.get(ip) as AsnRecord | null | undefined
    return {
      country: c?.country_code?.slice(0, 2) ?? null,
      asn: a?.autonomous_system_number ?? null,
      network: a?.autonomous_system_organization?.slice(0, 100) ?? null,
    }
  } catch {
    return none // a malformed address
  }
}

// Networks that rent out servers rather than connect homes and phones. The
// numbers are the big clouds and hosts crawlers run from; the pattern catches
// the long tail by name.
const DATA_CENTRE_ASNS = new Set([
  16509, 14618, // Amazon
  15169, 396982, // Google
  8075, // Microsoft
  32934, // Meta
  714, // Apple
  13335, // Cloudflare
  14061, // DigitalOcean
  24940, // Hetzner
  16276, // OVH
  63949, // Linode / Akamai
  20473, // Vultr
  31898, // Oracle
  45102, 37963, // Alibaba
  132203, 45090, // Tencent
  136907, // Huawei Cloud
  51167, // Contabo
  197540, // netcup
  12876, // Scaleway
  60781, 16265, // Leaseweb
  9009, // M247
  212238, // Datacamp
])
const DATA_CENTRE_NAME = /hosting|cloud|server|data ?cent(er|re)|colo(cation)?\b|\bvps\b|dedicated/i

function isDataCentre(asn: number | null, network: string | null) {
  return (asn !== null && DATA_CENTRE_ASNS.has(asn)) || (!!network && DATA_CENTRE_NAME.test(network))
}

// ---------- the daily visitor hash ----------

// A random secret kept only in memory and replaced every UTC day: the same
// person hashes the same all day and differently the next, and without the
// secret, which is never stored, no hash can be traced back to an address.
let salt = { day: '', value: '' }

function dailyHash(ip: string, ua: string) {
  const day = new Date().toISOString().slice(0, 10)
  if (salt.day !== day) salt = { day, value: randomBytes(32).toString('hex') }
  return createHash('sha256').update(`${salt.value}|${ip}|${ua}`).digest('hex').slice(0, 12)
}

// More misses than a person looking things up would make, from one visitor, in a short time.
const BURST_LIMIT = 30
const BURST_WINDOW_MS = 10 * 60_000
const recent = new Map<string, number[]>()

function isBurst(visitor: string) {
  const now = Date.now()
  if (recent.size > 5000) for (const [k, t] of recent) if (now - t[t.length - 1]! > BURST_WINDOW_MS) recent.delete(k)
  const times = (recent.get(visitor) ?? []).filter(t => now - t < BURST_WINDOW_MS)
  times.push(now)
  recent.set(visitor, times)
  return times.length > BURST_LIMIT
}

// ---------- reading headers ----------

/** "ar-EG,ar;q=0.9,en;q=0.8" → "ar-EG". */
function firstLanguage(header: string) {
  const tag = header.split(',')[0]?.split(';')[0]?.trim() ?? ''
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(tag) ? tag : null
}

function hostOf(url: string) {
  try {
    const host = new URL(url).hostname
    return host && /^[a-z0-9.-]{1,100}$/i.test(host) ? host.replace(/^www\./, '') : null
  } catch { return null }
}

function timeZoneOf(value: string | undefined) {
  return value && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(value) && value.length <= 40 ? value : null
}

/** A rough reading of the user agent: enough to tell a phone from a laptop, not a fingerprint. */
function parseUserAgent(ua: string, chMobile: boolean, chPlatform: string | null) {
  if (!ua) return { device: null, os: null, browser: null }
  const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet'
    : chMobile || /Mobi|iPhone|iPod/i.test(ua) ? 'mobile'
    : 'desktop'
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : chPlatform
  const browser = /Edg(e|A|iOS)?\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null
  return { device, os, browser }
}

// ---------- retention ----------

const KEEP_DAYS = 90
let lastPrune = 0

/** Drops events older than 90 days, at most once an hour. The per-term counters are kept. */
export async function pruneSearchMissEvents(db: Db) {
  if (Date.now() - lastPrune < 60 * 60_000) return
  lastPrune = Date.now()
  await db.delete(schema.searchMissEvents)
    .where(lt(schema.searchMissEvents.at, sql`now() - make_interval(days => ${KEEP_DAYS})`))
}
