import { REVEALS, puzzleNumber } from '../../../shared/utils/daily'

/**
 * The daily game's result card (docs/REACH.md, Phase R3): one per player, not
 * one per page, so it is built from the query string a finished round passes
 * it (?date=&guesses=&correct=&total=) rather than a database lookup — the
 * numbers alone are enough, and spoiler-free by construction since nothing
 * naming the word is ever read here. Cached in memory by that same tuple: the
 * space of real results is small (a handful of dates × six guesses × two
 * outcomes), so the cache stays small on its own.
 */
const cache = new LruCache<string, Buffer>(500)

export default defineEventHandler(async (event) => {
  const { date, guesses, correct, total } = getQuery(event)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400 })
  const n = Math.min(Math.max(Number(guesses) || 1, 1), REVEALS)
  const t = Math.min(Math.max(Number(total) || REVEALS, 1), REVEALS)
  const isCorrect = correct === '1' || correct === 'true'

  const cacheKey = `${date}:${n}:${isCorrect ? 1 : 0}:${t}`
  let png = cache.get(cacheKey)
  if (!png) {
    const svg = await dailyResultCardSvg({ number: puzzleNumber(date), guesses: n, correct: isCorrect, total: t })
    png = await renderCardPng(svg)
    cache.set(cacheKey, png)
  }

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return png
})
