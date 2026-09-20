import { eq } from 'drizzle-orm'
import { schema } from '../db'
import { slugify } from '../../shared/utils/arabic'
import type { Tx } from './contribute'

/**
 * A word's slug, guaranteed free (docs/REACH.md, Phase R5): slugify()'s
 * output as a first try, then -2, -3, … on collision — a real possibility
 * once punctuation is stripped, since two headwords that only differ by a
 * trailing «؟» or «!» slugify to the same thing despite being distinct rows
 * (POST /api/words only refuses an exact duplicate of the normalised
 * headword, not of the slug).
 *
 * A slugify() that returns nothing — a headword that was punctuation only,
 * not a real case but not one to crash on either — falls back to "كلمة"
 * rather than an empty path segment.
 */
export async function uniqueSlug(db: Tx, headword: string): Promise<string> {
  const base = slugify(headword) || 'كلمة'
  let candidate = base
  let n = 2
  // A handful of collisions is the realistic ceiling; guarded so a schema bug
  // elsewhere cannot turn this into an infinite loop on a request thread.
  for (let tries = 0; tries < 1000; tries++) {
    const clash = await db.query.words.findFirst({ where: eq(schema.words.slug, candidate) })
    if (!clash) return candidate
    candidate = `${base}-${n}`
    n++
  }
  throw new Error(`uniqueSlug: could not find a free slug for "${headword}" after 1000 tries`)
}
