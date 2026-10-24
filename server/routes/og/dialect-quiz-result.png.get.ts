import { QUIZ_ROUNDS } from '../../../shared/config/rules'
import { clampParam } from '../../utils/validate'

/**
 * «من أي لهجة؟»'s result card, built from the query string a finished session
 * passes it (?date=&correct=&total=) — the same reasoning as
 * /og/daily-result.png: no database lookup, and nothing naming a word or a
 * dialect is ever read here, so the card stays spoiler-free by construction.
 */
const cache = new LruCache<string, Buffer>(200)

export default defineEventHandler(async (event) => {
  const { date, correct, total } = getQuery(event)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400 })
  const t = clampParam(total, QUIZ_ROUNDS, QUIZ_ROUNDS)
  const c = clampParam(correct, 0, t, 0)

  const cacheKey = `${date}:${c}:${t}`
  let png = cache.get(cacheKey)
  if (!png) {
    const svg = await dialectQuizResultCardSvg({ correct: c, total: t })
    png = await renderCardPng(svg)
    cache.set(cacheKey, png)
  }

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return png
})
