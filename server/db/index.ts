import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import type { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import postgres from 'postgres'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as schema from './schema'
import { seedIfEmpty } from './seed'

export type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>

let dbPromise: Promise<Db> | undefined

/**
 * Returns the shared database handle.
 *
 * - With DATABASE_URL set: a real PostgreSQL connection. In production that is the
 *   Postgres container next to the app on the netcup server (managed through Coolify).
 *   Pending migrations from ./drizzle are applied here on startup, because the
 *   database is only reachable when the app runs, not while the image is built.
 * - Without it: an embedded PGlite database stored in ./.data/lahga, so local
 *   development needs no Postgres install. Migrations run automatically on first use.
 *   PGlite is imported lazily so production never loads its WASM.
 */
export function useDb(): Promise<Db> {
  if (!dbPromise) dbPromise = connect()
  return dbPromise
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 })
    const db = drizzlePg(client, { schema })
    await migratePg(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
    await seedIfEmpty(db)
    return db
  }
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate: migratePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ])
  const dataDir = resolve(process.cwd(), '.data/lahga')
  mkdirSync(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  await seedIfEmpty(db)
  return db
}

export { schema }
