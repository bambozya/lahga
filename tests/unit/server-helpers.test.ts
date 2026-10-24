import { describe, expect, it } from 'vitest'
import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { cardEntries, dialectGroup } from '../../server/utils/ordering'
import { rowsOf } from '../../server/utils/sql'
import { clampParam, idParam } from '../../server/utils/validate'

/** An h3 event whose route matched `params`, as the router would leave it. */
function eventWith(params: Record<string, string>) {
  const req = new IncomingMessage(new Socket())
  const event = createEvent(req, new ServerResponse(req))
  event.context.params = params
  return event
}

describe('rowsOf', () => {
  it('reads rows from postgres-js (an array) and from PGlite ({ rows })', () => {
    expect(rowsOf([{ a: 1 }])).toEqual([{ a: 1 }])
    expect(rowsOf({ rows: [{ a: 1 }] })).toEqual([{ a: 1 }])
    expect(rowsOf(undefined)).toEqual([])
    expect(rowsOf({})).toEqual([])
  })
})

describe('idParam', () => {
  it('returns a positive whole id', () => {
    expect(idParam(eventWith({ id: '12' }), 'غير موجود')).toBe(12)
  })

  it('answers anything else with the route\'s own 404, never a database error', () => {
    for (const bad of ['abc', '1.5', '0', '-3', '', '1e400', '9007199254740993']) {
      expect(() => idParam(eventWith({ id: bad }), 'المدخل غير موجود'), bad)
        .toThrow(expect.objectContaining({ statusCode: 404, statusMessage: 'المدخل غير موجود' }))
    }
  })

  it('reads a differently named parameter', () => {
    expect(idParam(eventWith({ wordId: '7' }), 'x', 'wordId')).toBe(7)
  })
})

describe('clampParam', () => {
  it('keeps a value in range and clamps one outside it', () => {
    expect(clampParam('3', 1, 6)).toBe(3)
    expect(clampParam('9', 1, 6)).toBe(6)
    expect(clampParam('-2', 1, 6)).toBe(1)
    expect(clampParam('2.7', 1, 6)).toBe(2)
  })

  it('falls back when the value is missing or not a number', () => {
    expect(clampParam(undefined, 1, 6)).toBe(1)
    expect(clampParam('', 6, 6)).toBe(6)
    expect(clampParam('abc', 3, 6)).toBe(3)
  })

  it('allows zero when asked to, as a score can be', () => {
    expect(clampParam('0', 0, 3, 0)).toBe(0)
    expect(clampParam(undefined, 0, 3, 0)).toBe(0)
    expect(clampParam('5', 0, 3, 0)).toBe(3)
  })
})

describe('dialectGroup', () => {
  it('reads a sub-dialect under its region, and a region as itself', () => {
    const egypt = { slug: 'egyptian', nameAr: 'مصري' }
    expect(dialectGroup({ slug: 'cairene', nameAr: 'قاهري', parent: egypt })).toEqual(egypt)
    expect(dialectGroup({ ...egypt, parent: null })).toEqual(egypt)
  })
})

describe('cardEntries', () => {
  const egypt = { slug: 'egyptian', nameAr: 'مصري', parent: null }
  const cairo = { slug: 'cairene', nameAr: 'قاهري', parent: { slug: 'egyptian', nameAr: 'مصري' } }
  const levant = { slug: 'levantine', nameAr: 'شامي', parent: null }
  const link = (id: number, form: string, up: number, dialect: typeof egypt | typeof cairo, status = 'active', entryStatus = 'active') =>
    ({ status, entry: { id, form, score: up, upvotes: up, downvotes: 0, status: entryStatus, dialect } })

  it('lists live forms only, a region together, best-supported first', () => {
    const forms = cardEntries([
      link(1, 'عربية', 1, egypt),
      link(2, 'سيارة', 9, levant),
      link(3, 'عربيّة', 5, cairo),
      link(4, 'مخفية', 50, levant, 'active', 'hidden'),
      link(5, 'رابط مخفي', 50, egypt, 'hidden'),
    ])
    expect(forms.map(f => f.id)).toEqual([2, 3, 1])
    // A card names the form's own dialect, not its region.
    expect(forms[1]!.dialect).toEqual({ slug: 'cairene', nameAr: 'قاهري' })
  })
})
