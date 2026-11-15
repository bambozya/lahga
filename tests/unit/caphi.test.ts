import { describe, expect, it } from 'vitest'
import { CAPHI_GROUPS, isCaphi, normalizeCaphi, unknownCaphi } from '../../shared/utils/caphi'

describe('isCaphi', () => {
  it('accepts the transcriptions the issue and the paper use', () => {
    expect(isCaphi('d i l w a 2 t i')).toBe(true) // دلوقتي
    expect(isCaphi('h a l l a 2')).toBe(true) // هلأ
    expect(isCaphi('d. a b a')).toBe(true)
    expect(isCaphi('7 a b b')).toBe(true) // a shadda is the consonant twice
    expect(isCaphi('q i s. s. a')).toBe(true)
    expect(isCaphi('dh. aa h i r')).toBe(true)
    expect(isCaphi('tsh aa f')).toBe(true)
  })

  it('accepts every example in its own table', () => {
    for (const g of CAPHI_GROUPS) for (const s of g.symbols) expect(isCaphi(s.caphi), s.caphi).toBe(true)
  })

  it('accepts the boundary markers and an empty field', () => {
    expect(isCaphi('m a + b i 2 uu l + h aa + sh')).toBe(true)
    expect(isCaphi('2 a n a # m i sh')).toBe(true)
    expect(isCaphi('')).toBe(true)
    expect(isCaphi('   ')).toBe(true)
  })

  it('refuses Arabic script, IPA and symbols outside the inventory', () => {
    expect(isCaphi('دلوقتي')).toBe(false)
    expect(isCaphi('dilwaʔti')).toBe(false)
    expect(isCaphi('d i l w a ʔ t i')).toBe(false)
    expect(isCaphi('x a l a s.')).toBe(false) // x is kh in CAPHI
    expect(isCaphi('c a f')).toBe(false)
    expect(isCaphi('t.. a')).toBe(false)
    expect(isCaphi('aaa')).toBe(false)
  })

  it('refuses a run with no spaces, so the writer learns about them', () => {
    expect(isCaphi('dilwa2ti')).toBe(false)
    expect(isCaphi('d i lwa 2 t i')).toBe(false)
  })

  it('forgives case and stray whitespace, which normalizeCaphi removes', () => {
    expect(isCaphi('  D I L  W A 2 T I ')).toBe(true)
    expect(normalizeCaphi('  D I L  W A 2 T I ')).toBe('d i l w a 2 t i')
  })
})

describe('unknownCaphi', () => {
  it('names each unknown symbol once', () => {
    expect(unknownCaphi('d i l w a ʔ t i x x')).toEqual(['ʔ', 'x'])
    expect(unknownCaphi('d i l w a 2 t i')).toEqual([])
  })
})

describe('the inventory', () => {
  it('lists each symbol once', () => {
    const all = CAPHI_GROUPS.flatMap(g => g.symbols.map(s => s.symbol))
    expect(new Set(all).size).toBe(all.length)
  })
})
