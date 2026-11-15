import { describe, expect, it } from 'vitest'
import { dailyMarks, marksText, quizMarks } from '../../shared/utils/games'

describe('the result row', () => {
  it('marks the attempt that landed, the ones before it, and the ones never reached', () => {
    expect(dailyMarks(3, true, 6)).toEqual(['used', 'used', 'right', 'open', 'open', 'open'])
    expect(dailyMarks(6, false, 6)).toEqual(['used', 'used', 'used', 'used', 'used', 'used'])
    expect(dailyMarks(1, true, 6)[0]).toBe('right')
  })

  it('shows the quiz as right rounds then wrong ones', () => {
    expect(quizMarks(2, 3)).toEqual(['right', 'right', 'used'])
    expect(quizMarks(0, 3)).toEqual(['used', 'used', 'used'])
  })

  it('writes the share text without red: green, black, white', () => {
    expect(marksText(dailyMarks(3, true, 6))).toBe('⬛⬛🟩⬜⬜⬜')
    expect(marksText(quizMarks(2, 3))).toBe('🟩🟩⬛')
    expect(marksText(dailyMarks(6, false, 6))).not.toContain('🟥')
  })
})
