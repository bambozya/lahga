import { describe, expect, it } from 'vitest'
import * as rules from '../../shared/config/rules'

// Not the values themselves, which are meant to be changed, but the ways they
// depend on each other: a change that breaks one of these breaks a feature.
describe('shared/config/rules.ts', () => {
  it('lets a daily puzzle exist at all', () => {
    // A puzzle needs MIN_GROUPS dialect groups and shows at most REVEALS of them.
    expect(rules.MIN_GROUPS).toBeLessThanOrEqual(rules.REVEALS)
    expect(rules.REVEALS).toBeGreaterThanOrEqual(2)
  })

  it('keeps the quiz a real choice', () => {
    expect(rules.QUIZ_CHOICES).toBeGreaterThanOrEqual(2)
    expect(rules.QUIZ_ROUNDS).toBeGreaterThanOrEqual(1)
  })

  it('keeps weights and similarities in range', () => {
    expect(rules.GUEST_WEIGHT).toBeGreaterThanOrEqual(0)
    expect(rules.GUEST_WEIGHT).toBeLessThanOrEqual(1)
    expect(rules.GUESS_SIMILARITY).toBeGreaterThan(0)
    expect(rules.GUESS_SIMILARITY).toBeLessThanOrEqual(1)
    expect(rules.CONFIRM_SCORE).toBeGreaterThan(0)
  })

  it('gives every rate limit a positive count and window', () => {
    for (const [name, rule] of Object.entries(rules.RATE_LIMITS)) {
      expect(rule.limit, name).toBeGreaterThan(0)
      expect(rule.windowMs, name).toBeGreaterThan(0)
    }
  })

  it('gives every cached page a positive lifetime', () => {
    for (const [name, seconds] of Object.entries(rules.PAGE_CACHE_SECONDS)) {
      expect(seconds, name).toBeGreaterThan(0)
    }
  })
})
