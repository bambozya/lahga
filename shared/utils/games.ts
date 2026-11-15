/**
 * How a game result is drawn (#48, #49): one mark per attempt or round, as a
 * row of nuqtas on the page and on the share card, and as emoji in the share
 * text, which cannot carry the shape. Right is green, wrong or used is ink,
 * never reached is the open outline (the meaning `--nuqta-open` has on the
 * site already: not there yet). The card, the page and the text read the
 * same from this one list.
 */
export type Mark = 'right' | 'used' | 'open'

/** كلمة اليوم: the attempts in order, the one that landed green, the rest ink, the unreached open. */
export function dailyMarks(guesses: number, correct: boolean, total: number): Mark[] {
  return Array.from({ length: total }, (_, i) => {
    const attempt = i + 1
    if (attempt > guesses) return 'open'
    return correct && attempt === guesses ? 'right' : 'used'
  })
}

/** «من أي لهجة؟»: right rounds first, then the wrong ones; every round is answered. */
export function quizMarks(correct: number, total: number): Mark[] {
  return Array.from({ length: total }, (_, i) => i < correct ? 'right' : 'used')
}

const EMOJI: Record<Mark, string> = { right: '🟩', used: '⬛', open: '⬜' }

/** The row as share text: green right, black used, white never reached, so text and card agree. */
export const marksText = (marks: Mark[]) => marks.map(m => EMOJI[m]).join('')
