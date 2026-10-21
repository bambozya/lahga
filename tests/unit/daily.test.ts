import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayBefore, puzzleNumber, todayDate } from '../../shared/utils/daily'
import { gameDate } from '../../server/utils/daily'

afterEach(() => {
  vi.useRealTimers()
})

describe('daily date helpers', () => {
  it('numbers puzzles from the launch day', () => {
    expect(puzzleNumber('2026-09-20')).toBe(1)
    expect(puzzleNumber('2026-09-21')).toBe(2)
    expect(puzzleNumber('2026-10-20')).toBe(31)
  })

  it('steps back across months, years and leap days', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28')
    expect(dayBefore('2028-03-01')).toBe('2028-02-29')
    expect(dayBefore('2027-01-01')).toBe('2026-12-31')
  })

  it('takes today in UTC, not local time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-21T23:59:59Z'))
    expect(todayDate()).toBe('2026-10-21')
    vi.setSystemTime(new Date('2026-10-22T00:00:00Z'))
    expect(todayDate()).toBe('2026-10-22')
  })
})

describe('gameDate (roadmap A7: a guess knows its day)', () => {
  const at = (iso: string) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(iso))
  }

  it('means today when the page sends no date', () => {
    at('2026-10-21T12:00:00Z')
    expect(gameDate(undefined)).toBe('2026-10-21')
    expect(gameDate('')).toBe('2026-10-21')
  })

  it('accepts yesterday, for a round begun before midnight', () => {
    at('2026-10-22T00:01:00Z')
    expect(gameDate('2026-10-21')).toBe('2026-10-21')
    expect(gameDate('2026-10-22')).toBe('2026-10-22')
  })

  it('refuses anything older, or tomorrow, or not a date at all', () => {
    at('2026-10-22T00:01:00Z')
    for (const bad of ['2026-10-20', '2026-10-23', 'yesterday', 20261021]) {
      expect(() => gameDate(bad)).toThrow(expect.objectContaining({ statusCode: 409 }))
    }
  })
})
