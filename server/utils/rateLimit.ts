import type { H3Event } from 'h3'

/**
 * Sliding-window rate limit kept in memory. The site runs as one process, so this
 * is enough for now; move it to the database or Redis if there is ever a second one.
 */
const hits = new Map<string, number[]>()

// Drop old entries now and then so the map does not grow forever.
let lastSweep = Date.now()
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, times] of hits) {
    const kept = times.filter(t => now - t < windowMs)
    if (kept.length) hits.set(key, kept); else hits.delete(key)
  }
}

export function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

/** Throws 429 when `key` was seen more than `limit` times in the last `windowMs`. */
export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  sweep(now, windowMs)
  const times = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (times.length >= limit) {
    throw createError({ statusCode: 429, statusMessage: 'محاولات كثيرة، حاول لاحقاً' })
  }
  times.push(now)
  hits.set(key, times)
}
