import { loadExport } from '../utils/exportData'

/** The counts and the timestamp the /data page shows; the files themselves are under /data/. */
export default defineEventHandler(async () => (await loadExport()).meta)
