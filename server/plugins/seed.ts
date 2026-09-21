import { useDb } from '../db'

/**
 * Warm the database at startup: migrations and seed happen inside useDb().
 * If the database is not reachable yet (it restarts, or the app came up first),
 * keep trying in the background with a growing pause instead of giving up.
 */
export default defineNitroPlugin(() => {
  void (async () => {
    for (let pause = 3000; ; pause = Math.min(pause * 2, 30_000)) {
      try {
        await useDb()
        return
      } catch {
        // useDb() has logged the reason.
        await new Promise(r => setTimeout(r, pause))
      }
    }
  })()
})
