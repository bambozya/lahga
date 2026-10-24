import { afterEach, describe, expect, it, vi } from 'vitest'
import { LruCache } from '../../server/utils/lru'
import { normalizeCacheKey } from '../../server/utils/pageCache'
import { assertRateLimit } from '../../server/utils/rateLimit'

afterEach(() => {
  vi.useRealTimers()
})

describe('assertRateLimit', () => {
  it('lets `limit` requests through, refuses the next with 429, then forgets', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-21T12:00:00Z'))
    const key = `test:${Math.random()}`
    const rule = { limit: 3, windowMs: 1000 }
    for (let i = 0; i < 3; i++) assertRateLimit(key, rule)
    expect(() => assertRateLimit(key, rule)).toThrow(expect.objectContaining({ statusCode: 429 }))

    vi.setSystemTime(new Date('2026-10-21T12:00:01.001Z'))
    expect(() => assertRateLimit(key, rule)).not.toThrow()
  })

  it('keeps one bucket per key', () => {
    const a = `a:${Math.random()}`, b = `b:${Math.random()}`
    const rule = { limit: 1, windowMs: 60_000 }
    assertRateLimit(a, rule)
    expect(() => assertRateLimit(a, rule)).toThrow()
    expect(() => assertRateLimit(b, rule)).not.toThrow()
  })
})

describe('LruCache', () => {
  it('drops the least recently used entry past its size', () => {
    const lru = new LruCache<string, number>(2)
    lru.set('a', 1)
    lru.set('b', 2)
    lru.get('a') // touched: b is now the oldest
    lru.set('c', 3)
    expect(lru.get('a')).toBe(1)
    expect(lru.get('b')).toBeUndefined()
    expect(lru.get('c')).toBe(3)
  })
})

describe('normalizeCacheKey (roadmap A4: one cache entry per page)', () => {
  it('drops query parameters that do not change the page', () => {
    expect(normalizeCacheKey('/w/سيارة?n=1')).toBe('/w/سيارة')
    expect(normalizeCacheKey('/d/egyptian?utm_source=x')).toBe('/d/egyptian')
  })

  it('keeps the ones that do, in a fixed order', () => {
    expect(normalizeCacheKey('/?utm=1&q=قطة')).toBe(`/?q=${encodeURIComponent('قطة')}`)
    expect(normalizeCacheKey('/w/سيارة?x=1&added=1')).toBe('/w/سيارة?added=1')
  })

  it('leaves uncached paths and plain URLs alone', () => {
    expect(normalizeCacheKey('/settings/admin?status=open')).toBeUndefined()
    expect(normalizeCacheKey('/w/سيارة')).toBeUndefined()
    expect(normalizeCacheKey('/w/سيارة/history?x=1')).toBeUndefined()
  })
})
