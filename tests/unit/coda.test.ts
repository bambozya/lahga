import { describe, expect, it } from 'vitest'
import { codaFlags } from '../../shared/utils/coda'

const rules = (form: string, near?: { headword: string, forms: string[] }) => codaFlags(form, near).map(f => f.rule)

describe('codaFlags', () => {
  it('flags the dialect letters for /g/ and guesses the ق spelling', () => {
    const [f] = codaFlags('گال', { headword: 'قال', forms: ['قال', 'آل'] })
    expect(f).toMatchObject({ rule: 'gaf', suggestion: 'قال', evidence: 'قال' })
    expect(codaFlags('ڨهوة')[0]).toMatchObject({ rule: 'gaf', suggestion: 'قهوة', evidence: null })
  })

  it('flags ت د ض ز for a historical letter only when the dictionary knows the etymological spelling', () => {
    expect(codaFlags('تلاتة', { headword: 'ثلاثة', forms: [] })[0]).toMatchObject({ rule: 'etymological', suggestion: 'ثلاثة' })
    expect(codaFlags('دهب', { headword: 'ذهب', forms: ['ذهب'] })[0]).toMatchObject({ rule: 'etymological', suggestion: 'ذهب' })
    expect(rules('تلاتة', { headword: 'الرقم ثلاثة', forms: [] })).toEqual([])
    expect(rules('تلاتة')).toEqual([])
  })

  it('leaves a form with the etymological letters alone', () => {
    expect(rules('ثلاثة', { headword: 'ثلاثة', forms: ['تلاتة'] })).toEqual([])
    expect(rules('قال', { headword: 'قال', forms: ['گال'] })).toEqual([])
  })

  it('flags a final ه where the word ends in ة elsewhere', () => {
    expect(codaFlags('مدرسه', { headword: 'مدرسة', forms: [] })[0]).toMatchObject({ rule: 'taa-marbuta', suggestion: 'مدرسة' })
    expect(rules('مياه', { headword: 'ماء', forms: [] })).toEqual([])
    expect(rules('كتابه', { headword: 'كتابه', forms: [] })).toEqual([])
  })

  it('flags ما glued to a negated verb, not to a pronoun', () => {
    expect(codaFlags('ماقالش')[0]).toMatchObject({ rule: 'negation', suggestion: 'ما قالش' })
    expect(codaFlags('مابيقولهاش')[0]).toMatchObject({ rule: 'negation', suggestion: 'ما بيقولهاش' })
    expect(codaFlags('هو مابيقولهاش')[0]).toMatchObject({ rule: 'negation', suggestion: 'هو ما بيقولهاش' })
    expect(rules('ماهوش')).toEqual([])
    expect(rules('مافيش')).toEqual([])
    expect(rules('ما قالش')).toEqual([])
    expect(rules('ماش')).toEqual([])
  })

  it('gives every applicable flag at once', () => {
    expect(rules('ماگالش', { headword: 'قال', forms: [] })).toEqual(['gaf', 'negation'])
  })
})
