/**
 * A tiny in-process LRU, good for a few hundred rendered card buffers (see
 * docs/REACH.md, Phase R2: this is the one thing standing between a crawler
 * hammering /og/w/[id].png and rasterising the same word on every hit). Not
 * shared across worker processes or restarts — the `cache-control` header on
 * the response is the durable cache; this just keeps the current process from
 * redoing work a request ago.
 */
export class LruCache<K, V> {
  private map = new Map<K, V>()
  constructor(private readonly max: number) {}

  get(key: K): V | undefined {
    const v = this.map.get(key)
    if (v === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, v) // touched: move to the most-recently-used end
    return v
  }

  set(key: K, value: V) {
    this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
  }
}
