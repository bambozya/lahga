import type { H3Event } from 'h3'

/**
 * Sliding-window rate limit kept in memory. The site runs as one process, so this
 * is enough for now; move it to the database or Redis if there is ever a second one.
 */
const hits = new Map<string, { times: number[]; windowMs: number }>()

// Drop old entries now and then so the map does not grow forever. Each key is trimmed
// by its own window: a login sweep (15 minutes) must not shorten an hourly limit.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, hit] of hits) {
    hit.times = hit.times.filter(t => now - t < hit.windowMs)
    if (!hit.times.length) hits.delete(key)
  }
}

export function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

/** Throws 429 when `key` was seen more than `limit` times in the last `windowMs`. */
export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  sweep(now)
  const times = (hits.get(key)?.times ?? []).filter(t => now - t < windowMs)
  if (times.length >= limit) {
    throw createError({ statusCode: 429, statusMessage: 'محاولات كثيرة، حاول لاحقاً' })
  }
  times.push(now)
  hits.set(key, { times, windowMs })
}
