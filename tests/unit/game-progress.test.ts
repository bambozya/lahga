import { describe, expect, it } from 'vitest'
import { capHistory, liveStreak, migrate } from '../../app/composables/useGameProgress'

describe('migrate (the stored shape of a game\'s progress)', () => {
  it('keeps a v1 record from before the game kit: history and streak survive the deploy', () => {
    const v1 = { streak: 4, lastPlayedDate: '2026-10-20', history: { '2026-10-20': { guesses: 3, correct: true } } }
    expect(migrate(v1)).toEqual({ v: 2, streak: 4, lastPlayedDate: '2026-10-20', history: v1.history, current: null })
  })

  it('keeps a v2 round in progress', () => {
    const v2 = { v: 2, streak: 1, lastPlayedDate: null, history: {}, current: { date: '2026-10-24', round: { slot: 2 } } }
    expect(migrate(v2).current).toEqual({ date: '2026-10-24', round: { slot: 2 } })
  })

  it('starts clean on garbage or on a shape from a newer site', () => {
    for (const bad of [null, 'x', 42, { v: 99, streak: 5 }]) {
      expect(migrate(bad)).toEqual({ v: 2, streak: 0, lastPlayedDate: null, history: {}, current: null })
    }
  })

  it('repairs fields of the wrong type instead of trusting them', () => {
    const m = migrate({ streak: 'many', lastPlayedDate: 3, history: 'none' })
    expect(m).toMatchObject({ streak: 0, lastPlayedDate: null, history: {} })
  })
})

describe('capHistory', () => {
  it('keeps the newest days and drops the oldest', () => {
    const h = { '2026-01-03': 3, '2026-01-01': 1, '2026-01-02': 2 }
    expect(capHistory(h, 2)).toEqual({ '2026-01-02': 2, '2026-01-03': 3 })
    expect(capHistory(h, 5)).toBe(h)
  })
})

describe('liveStreak', () => {
  it('counts while the last game was today or yesterday', () => {
    expect(liveStreak({ streak: 3, lastPlayedDate: '2026-10-24' }, '2026-10-24')).toBe(3)
    expect(liveStreak({ streak: 3, lastPlayedDate: '2026-10-23' }, '2026-10-24')).toBe(3)
  })

  it('is gone once a whole day was missed', () => {
    expect(liveStreak({ streak: 3, lastPlayedDate: '2026-10-22' }, '2026-10-24')).toBe(0)
    expect(liveStreak({ streak: 0, lastPlayedDate: null }, '2026-10-24')).toBe(0)
  })
})
