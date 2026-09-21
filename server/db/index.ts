import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'
import * as schema from './schema'
import { seedIfEmpty, ensureDevAdmin } from './seed'
import { backfillWordSlugs } from './backfill'

// Typed as the Postgres flavour; the PGlite handle has the same API and is cast to it,
// which keeps query builders (insert().returning(), transactions) typed as one thing.
export type Db = ReturnType<typeof drizzlePg<typeof schema>>

let dbPromise: Promise<Db> | undefined

const RETRY_PAUSE_MS = 2000
let lastFailure = 0

// Any fixed number; it only has to be the same in every container of this app.
const MIGRATION_LOCK = 20260921

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
  if (dbPromise) return dbPromise
  // A failed start is not remembered: the next request tries again. Requests that
  // arrive while an attempt is running share it, and after a failure there is a short
  // pause, so a database that is down is not hammered.
  if (Date.now() - lastFailure < RETRY_PAUSE_MS) {
    return Promise.reject(createError({ statusCode: 503, statusMessage: 'قاعدة البيانات غير متاحة الآن، حاول بعد لحظات' }))
  }
  const attempt = connect().catch((e) => {
    console.error('[lahga] database start failed, will retry on a later request', e)
    lastFailure = Date.now()
    if (dbPromise === attempt) dbPromise = undefined
    throw e
  })
  dbPromise = attempt
  return attempt
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    const client = postgres(url, { prepare: false, max: 5, connect_timeout: 10 })
    try {
      const db = drizzlePg(client, { schema })
      // During a deploy the old and the new container run side by side for a moment.
      // The advisory lock makes the second one wait instead of migrating at the same time.
      // It lives on one reserved connection, because a lock belongs to a connection.
      const lock = await client.reserve()
      try {
        await lock`select pg_advisory_lock(${MIGRATION_LOCK})`
        await migratePg(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
        await seedIfEmpty(db)
        await backfillWordSlugs(db)
      } finally {
        await lock`select pg_advisory_unlock(${MIGRATION_LOCK})`.catch(() => {})
        lock.release()
      }
      return db
    } catch (e) {
      await client.end({ timeout: 1 }).catch(() => {})
      throw e
    }
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
  await backfillWordSlugs(db)
  await ensureDevAdmin(db)
  return db
}

export { schema }
