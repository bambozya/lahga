import { describe, expect, it } from 'vitest'
import { echoesWord } from '../../server/utils/contribute'
import { groupByRegion } from '../../server/utils/ordering'
import { wilson } from '../../server/utils/votes'

describe('echoesWord (the content rule: no line repeats the word it hangs under)', () => {
  it('catches a line that only repeats its heading', () => {
    expect(echoesWord('الأخ', 'أخ')).toBe(true)
    expect(echoesWord('السيارة.', 'سيارة')).toBe(true)
    expect(echoesWord('عربية', 'سيارة', 'عربية')).toBe(true)
  })

  it('lets a real definition through', () => {
    expect(echoesWord('سيارة صغيرة', 'سيارة')).toBe(false)
    expect(echoesWord('مركبة بأربع عجلات', 'سيارة')).toBe(false)
  })

  it('treats an empty line as nothing to object to', () => {
    expect(echoesWord(null, 'سيارة')).toBe(false)
    expect(echoesWord('', 'سيارة')).toBe(false)
  })
})

describe('wilson', () => {
  it('is zero without votes and stays between 0 and 1', () => {
    expect(wilson(0, 0)).toBe(0)
    for (const [up, down] of [[1, 0], [0, 1], [50, 50], [1000, 3]]) {
      const w = wilson(up!, down!)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })

  it('rewards agreement over volume', () => {
    expect(wilson(5, 0)).toBeGreaterThan(wilson(30, 20))
  })

  it('trusts more of the same evidence more', () => {
    expect(wilson(10, 0)).toBeGreaterThan(wilson(1, 0))
  })
})

describe('groupByRegion', () => {
  const egypt = { slug: 'egyptian', nameAr: 'مصري' }
  const levant = { slug: 'levantine', nameAr: 'شامي' }
  const e = (id: number, rank: number, score: number, group: typeof egypt) => ({ id, rank, score, group })

  it('puts the best-supported form first and keeps a region together', () => {
    const groups = groupByRegion([
      e(1, 0.2, 1, egypt),
      e(2, 0.9, 5, levant),
      e(3, 0.5, 2, egypt),
      e(4, 0.1, 0, levant),
    ])
    expect(groups.map(g => g.slug)).toEqual(['levantine', 'egyptian'])
    expect(groups[0]!.entries.map(x => x.id)).toEqual([2, 4])
    expect(groups[1]!.entries.map(x => x.id)).toEqual([3, 1])
  })

  it('breaks ties by score, then by age', () => {
    const [g] = groupByRegion([e(7, 0.5, 1, egypt), e(5, 0.5, 1, egypt), e(6, 0.5, 3, egypt)])
    expect(g!.entries.map(x => x.id)).toEqual([6, 5, 7])
  })
})
