import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as schema from './schema'
import { seedIfEmpty, ensureDevAdmin } from './seed'

// Typed as the Postgres flavour; the PGlite handle has the same API and is cast to it,
// which keeps query builders (insert().returning(), transactions) typed as one thing.
export type Db = ReturnType<typeof drizzlePg<typeof schema>>

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
  const [{ PGlite }, { pg_trgm }, { drizzle: drizzlePglite }, { migrate: migratePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite/contrib/pg_trgm'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ])
  const dataDir = resolve(process.cwd(), '.data/lahga')
  mkdirSync(dataDir, { recursive: true })
  // pg_trgm backs the search index (migration 0005); PGlite needs the extension handed in.
  const client = new PGlite(dataDir, { extensions: { pg_trgm } })
  const db = drizzlePglite(client, { schema }) as unknown as Db
  await migratePglite(db as any, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  await seedIfEmpty(db)
  await ensureDevAdmin(db)
  return db
}

export { schema }
