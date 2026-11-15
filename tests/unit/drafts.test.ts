import { describe, expect, it } from 'vitest'
import { draftNet, isConfirmed, isTurnedDown } from '../../shared/utils/drafts'
import { CONFIRM_SCORE, GUEST_WEIGHT } from '../../shared/config/rules'

describe('a draft\'s standing', () => {
  it('counts a guest at GUEST_WEIGHT next to a member', () => {
    expect(draftNet(1, 2)).toBe(1 + 2 * GUEST_WEIGHT)
  })

  it('is confirmed by two members or four guests', () => {
    expect(isConfirmed(CONFIRM_SCORE, 0)).toBe(true)
    expect(isConfirmed(0, CONFIRM_SCORE / GUEST_WEIGHT)).toBe(true)
    expect(isConfirmed(1, 1)).toBe(false)
    expect(isConfirmed(0, 0)).toBe(false)
  })

  it('is turned down at the mirror of the confirming score', () => {
    expect(isTurnedDown(-CONFIRM_SCORE, 0)).toBe(true)
    expect(isTurnedDown(0, -CONFIRM_SCORE / GUEST_WEIGHT)).toBe(true)
    expect(isTurnedDown(-1, -1)).toBe(false)
    expect(isTurnedDown(0, 0)).toBe(false)
  })

  it('never calls one draft both', () => {
    for (let s = -4; s <= 4; s++) for (let g = -8; g <= 8; g++) expect(isConfirmed(s, g) && isTurnedDown(s, g)).toBe(false)
  })
})
