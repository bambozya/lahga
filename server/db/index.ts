import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import postgres from 'postgres'
import { PGlite } from '@electric-sql/pglite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as schema from './schema'
import { seedIfEmpty } from './seed'

export type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>

let dbPromise: Promise<Db> | undefined

/**
 * Returns the shared database handle.
 *
 * - With DATABASE_URL set: a real PostgreSQL connection (Neon, Supabase, local, …).
 *   Migrations are applied separately with `npm run db:migrate` (the build script does it).
 * - Without it: an embedded PGlite database stored in ./.data/lahga, so local
 *   development needs no Postgres install. Migrations run automatically on first use.
 */
export function useDb(): Promise<Db> {
  if (!dbPromise) dbPromise = connect()
  return dbPromise
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    const client = postgres(url, { prepare: false })
    const db = drizzlePg(client, { schema })
    await seedIfEmpty(db)
    return db
  }
  const dataDir = resolve(process.cwd(), '.data/lahga')
  mkdirSync(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  await seedIfEmpty(db)
  return db
}

export { schema }
