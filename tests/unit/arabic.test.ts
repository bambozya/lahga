import { describe, expect, it } from 'vitest'
import {
  arabicDigits, bareForm, formKey, hasDiacritics, isArabicOnly, looseArabicKey, looseArabicPattern, normalizeArabic, slugify, splitForm,
} from '../../shared/utils/arabic'

describe('normalizeArabic', () => {
  it('folds the letters people write interchangeably', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد')
    expect(normalizeArabic('إسلام')).toBe('اسلام')
    expect(normalizeArabic('آخر')).toBe('اخر')
    expect(normalizeArabic('مدرسة')).toBe('مدرسه')
    expect(normalizeArabic('مستشفى')).toBe('مستشفي')
    expect(normalizeArabic('مؤمن')).toBe('مومن')
    expect(normalizeArabic('سائل')).toBe('سايل')
  })

  it('drops tashkeel and tatweel', () => {
    expect(normalizeArabic('كَتَبَ')).toBe('كتب')
    expect(normalizeArabic('كـــتب')).toBe('كتب')
    expect(normalizeArabic('هلّق')).toBe(normalizeArabic('هلق'))
  })

  it('collapses and trims whitespace', () => {
    expect(normalizeArabic('  كيف   حالك ')).toBe('كيف حالك')
  })
})

describe('slugify', () => {
  it('keeps the real spelling, unlike the search index', () => {
    expect(slugify('سيارة')).toBe('سيارة')
    expect(slugify('مستشفى')).toBe('مستشفى')
  })

  it('turns spaces into hyphens and drops diacritics and punctuation', () => {
    expect(slugify('كيف حالك؟')).toBe('كيف-حالك')
    expect(slugify('كَتَبَ')).toBe('كتب')
    expect(slugify('«مرحبا»!')).toBe('مرحبا')
  })
})

describe('isArabicOnly', () => {
  it('accepts Arabic, both kinds of digits and common punctuation', () => {
    expect(isArabicOnly('قطة')).toBe(true)
    expect(isArabicOnly('١٢ قطة، و3 كلاب.')).toBe(true)
    expect(isArabicOnly('«شو؟»')).toBe(true)
    expect(isArabicOnly('')).toBe(true)
  })

  it('accepts the letters dialect writers add: گ ڨ ݣ چ ڤ پ', () => {
    expect(isArabicOnly('گال ڨال ݣال چاي ڤيلا پاپا')).toBe(true)
  })

  it('refuses any Latin letter', () => {
    expect(isArabicOnly('qitta')).toBe(false)
    expect(isArabicOnly('قطة cat')).toBe(false)
  })
})

describe('looseArabicKey', () => {
  const key = (s: string) => looseArabicKey(normalizeArabic(s))

  it('joins one word spelled two ways', () => {
    expect(key('كمترة')).toBe(key('كمثرى'))
    expect(key('هدا')).toBe(key('هذا'))
    expect(key('گريب')).toBe(key('قريب'))
    expect(key('الغريب')).toBe(key('غريب'))
  })

  it('keeps two different words apart', () => {
    expect(key('بندورة')).not.toBe(key('طماطم'))
    expect(key('لا')).not.toBe(key('له'))
    expect(key('هاد')).not.toBe(key('هدا'))
  })

  it('does not strip ال from a word too short to have it', () => {
    expect(key('الله')).not.toBe(key('له'))
  })
})

describe('looseArabicPattern', () => {
  it('returns null when there is nothing to loosen', () => {
    expect(looseArabicPattern('غريب')).toBeNull()
  })

  it('matches the spellings people drift between', () => {
    const p = new RegExp(`^${looseArabicPattern(normalizeArabic('كمثرة'))}$`)
    expect(p.test(normalizeArabic('كمترا'))).toBe(true)
    expect(p.test(normalizeArabic('كمثرى'))).toBe(true)
    expect(p.test(normalizeArabic('كمون'))).toBe(false)
  })
})

describe('formKey', () => {
  it('ignores punctuation, tashkeel and spelling drift the index ignores', () => {
    expect(formKey('هلّق')).toBe(formKey('هلق'))
    expect(formKey('شخبارك؟')).toBe(formKey('شخبارك'))
  })
})

describe('arabicDigits', () => {
  it('renders Arabic-Indic digits', () => {
    expect(arabicDigits(18)).toBe('١٨')
    expect(arabicDigits(0)).toBe('٠')
  })
})

describe('splitForm', () => {
  it('keeps a bare form bare', () => {
    expect(splitForm('يغنج')).toEqual({ form: 'يغنج', formVocalized: null })
    expect(splitForm('يغنج', '')).toEqual({ form: 'يغنج', formVocalized: null })
  })
  it('pairs a bare form with its vowelled spelling', () => {
    expect(splitForm('يغنج', 'يِغَنِّج')).toEqual({ form: 'يغنج', formVocalized: 'يِغَنِّج' })
    expect(splitForm('هلق', 'هلّق')).toEqual({ form: 'هلق', formVocalized: 'هلّق' })
  })
  it('splits a form typed with harakat and no separate vowelled spelling', () => {
    expect(splitForm('يِغَنِّج')).toEqual({ form: 'يغنج', formVocalized: 'يِغَنِّج' })
    expect(splitForm('كتّر خيرك')).toEqual({ form: 'كتر خيرك', formVocalized: 'كتّر خيرك' })
  })
  it('refuses a vowelled spelling that is another word', () => {
    expect(splitForm('يغنج', 'يِغَنِّي')).toBeNull()
    expect(splitForm('بيت', 'بِنْت')).toBeNull()
  })
  it('drops a vowelled spelling that carries no mark', () => {
    expect(splitForm('يغنج', 'يغنج')).toEqual({ form: 'يغنج', formVocalized: null })
  })
  it('bareForm and hasDiacritics agree with the search index on what a mark is', () => {
    expect(bareForm('يِغَنِّج')).toBe('يغنج')
    expect(bareForm('كـتاب')).toBe('كتاب')
    expect(hasDiacritics('هلّق')).toBe(true)
    expect(hasDiacritics('هلق')).toBe(false)
  })
})
