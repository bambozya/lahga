import { loadExport } from '../../utils/exportData'

/** The whole public dictionary as one JSON file (docs/DISCOVERY.md). */
export default defineEventHandler(async (event) => {
  const data = await loadExport()
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  setHeader(event, 'content-disposition', 'inline; filename="lahga.json"')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  // Anyone may fetch it from a script on another origin: that is what it is for.
  setHeader(event, 'access-control-allow-origin', '*')
  setHeader(event, 'link', '<https://creativecommons.org/licenses/by-sa/4.0/>; rel="license"')
  return JSON.stringify(data, null, 1)
})
