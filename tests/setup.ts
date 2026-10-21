/**
 * Nitro gives server code a few globals without an import (createError,
 * defineEventHandler, …). Outside Nitro they do not exist, so the server
 * utilities under test would fail on them. h3 is where Nitro gets them, so
 * hand the same functions in here.
 */
import * as h3 from 'h3'

Object.assign(globalThis, {
  createError: h3.createError,
  defineEventHandler: h3.defineEventHandler,
  getHeader: h3.getHeader,
  getQuery: h3.getQuery,
  getRequestIP: h3.getRequestIP,
  getRouterParam: h3.getRouterParam,
})

// h3 warns on every statusMessage longer than a few words, and the site's are
// whole Arabic sentences by design. In a test run that is noise, nothing more.
const warn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[h3] Please prefer using `message`')) return
  warn(...args)
}
