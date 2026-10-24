/**
 * The rows of a raw `db.execute(sql…)` result, whichever database ran it.
 *
 * Production runs postgres-js, whose `execute` returns the rows as an array;
 * local development and the smoke test run PGlite, whose `execute` returns
 * `{ rows }`. Drizzle passes both through untouched, so every raw query needs
 * the same guard, and this is it.
 */
export function rowsOf<T = any>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  return ((result as { rows?: T[] } | null)?.rows) ?? []
}
