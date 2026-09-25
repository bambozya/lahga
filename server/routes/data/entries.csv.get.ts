import { loadExport, entriesCsv } from '../../utils/exportData'

/** One dialect form per row (docs/DISCOVERY.md). */
export default defineEventHandler(async (event) => {
  const data = await loadExport()
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'inline; filename="lahga-entries.csv"')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  setHeader(event, 'access-control-allow-origin', '*')
  setHeader(event, 'link', '<https://creativecommons.org/licenses/by-sa/4.0/>; rel="license"')
  return entriesCsv(data)
})
