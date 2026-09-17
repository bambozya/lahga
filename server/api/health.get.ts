import { sql } from 'drizzle-orm'
import { useDb } from '../db'

/** Health check for the container: answers 200 only when the database responds. */
export default defineEventHandler(async () => {
  const db = await useDb()
  await db.execute(sql`select 1`)
  return { ok: true }
})
