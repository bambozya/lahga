import { describe, expect, it } from 'vitest'
import { joinSpellings, resolveSpellings, splitSpellings } from '../../shared/utils/spellings'
import { MAX_SPELLINGS } from '../../shared/config/rules'

describe('splitSpellings', () => {
  it('splits on either comma and trims', () => {
    expect(splitSpellings('هاد، هد')).toEqual(['هاد', 'هد'])
    expect(splitSpellings(' هاد ,هد ;هذ\nهاذ ')).toEqual(['هاد', 'هد', 'هذ', 'هاذ'])
    expect(splitSpellings('')).toEqual([])
  })

  it('strips harakat: a spelling is bare, like the main form', () => {
    expect(splitSpellings('هَاد')).toEqual(['هاد'])
  })
})

describe('resolveSpellings', () => {
  it('keeps the six Darija spellings of had, minus the main one', () => {
    expect(resolveSpellings('هدا', ['هذا', 'هدا', 'هاد', 'هاذ', 'هد', 'هذ'])).toEqual(['هذا', 'هاد', 'هاذ', 'هد', 'هذ'])
  })

  it('drops repeats and what search already folds into the main form', () => {
    expect(resolveSpellings('هلق', ['هلّق', 'هلق', 'هلأ', 'هلأ'])).toEqual(['هلأ'])
    expect(resolveSpellings('مستشفى', ['مستشفي', 'سبيطار'])).toEqual(['سبيطار'])
  })

  it('caps the list', () => {
    const many = Array.from({ length: MAX_SPELLINGS + 3 }, (_, i) => `كلمة${i}`)
    expect(resolveSpellings('أصل', many)).toHaveLength(MAX_SPELLINGS)
  })

  it('round-trips through the forms', () => {
    const list = resolveSpellings('هدا', splitSpellings('هاد، هد'))
    expect(splitSpellings(joinSpellings(list))).toEqual(list)
  })
})
