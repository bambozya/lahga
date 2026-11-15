import { describe, expect, it } from 'vitest'
import { arabicCount, checkMarks, checkShareText, dialectProgress, wordsCount } from '../../shared/utils/check'

describe('a round of «هل تُقال هكذا؟»', () => {
  it('draws a card seen the same whatever was said, and green only where a draft was settled', () => {
    const yes = { answered: true, confirmed: false }, pass = { answered: false, confirmed: false }, settled = { answered: true, confirmed: true }
    expect(checkMarks([yes, pass, settled], 5)).toEqual(['used', 'used', 'right', 'open', 'open'])
    expect(checkMarks([], 3)).toEqual(['open', 'open', 'open'])
  })

  it('makes the noun agree with the number', () => {
    expect([1, 2, 3, 10, 11].map(wordsCount)).toEqual(['كلمة واحدة', 'كلمتين', '٣ كلمات', '١٠ كلمات', '١١ كلمة'])
  })

  it('groups thousands', () => {
    expect([7, 412, 1030, 25922, 1234567].map(arabicCount)).toEqual(['٧', '٤١٢', '١٬٠٣٠', '٢٥٬٩٢٢', '١٬٢٣٤٬٥٦٧'])
  })

  it('shares settled words when there are any, answers otherwise, and the dialect link', () => {
    const d = { slug: 'libyan', nameAr: 'الليبية' }
    expect(checkShareText({ answered: 8, confirmed: 3 }, d)).toBe('ثبّتُّ اليوم ٣ كلمات في الليبية على معجم لهجة. هل تتكلمها؟\nhttps://lahga.fyi/check?dialect=libyan')
    expect(checkShareText({ answered: 8, confirmed: 0 }, d)).toContain('أجبت اليوم عن ٨ كلمات في الليبية')
  })
})

describe('the dialect list', () => {
  const row = (id: number, parentId: number | null, sortOrder: number) => ({ id, parentId, slug: `d${id}`, nameAr: `د${id}`, sortOrder })
  const t = (n: number, checked: number, total: number) => ({ n, checked, total })

  it('puts each dialect under its main one, in sort order, with its depth', () => {
    const rows = [row(3, 1, 2), row(1, null, 1), row(2, null, 2), row(4, 1, 1)]
    const tallies = new Map([[1, t(1, 5, 10)], [2, t(0, 4, 4)], [3, t(2, 0, 2)], [4, t(3, 1, 4)]])
    expect(dialectProgress(rows, tallies).map(d => [d.slug, d.depth])).toEqual([['d1', 0], ['d4', 1], ['d3', 1], ['d2', 0]])
  })

  it('keeps a main dialect without forms as a heading, and drops what has nothing under it', () => {
    const rows = [row(1, null, 1), row(2, 1, 1), row(3, null, 2), row(4, 3, 1)]
    const list = dialectProgress(rows, new Map([[2, t(1, 0, 1)]]))
    expect(list.map(d => d.slug)).toEqual(['d1', 'd2'])
    expect(list[0]!.total).toBe(0)
  })

  it('lists a dialect whose parent is missing as a main one, and survives a loop', () => {
    expect(dialectProgress([row(2, 9, 1)], new Map([[2, t(1, 0, 1)]])).map(d => d.depth)).toEqual([0])
    expect(dialectProgress([row(1, 2, 1), row(2, 1, 2)], new Map([[1, t(1, 0, 1)]]))).toEqual([])
  })
})
