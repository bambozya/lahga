import { useDb } from '../db'

/** Warm the database at startup: migrations and seed happen inside useDb(). */
export default defineNitroPlugin(async () => {
  await useDb()
})
