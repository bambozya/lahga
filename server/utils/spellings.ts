import { eq } from 'drizzle-orm'
import { schema } from '../db'
import type { Tx } from './contribute'
import { normalizeArabic } from '../../shared/utils/arabic'
import { resolveSpellings } from '../../shared/utils/spellings'

/**
 * Sets an entry's other spellings (entry_spellings) to `list`, resolved
 * against its main form (resolveSpellings): the old rows go, the new ones come,
 * and what was stored is returned for the revision. An undefined list means
 * «none», so a caller that wants to keep the current ones reads them first.
 */
export async function replaceSpellings(tx: Tx, entryId: number, form: string, list: string[] | undefined): Promise<string[]> {
  const spellings = resolveSpellings(form, list ?? [])
  await tx.delete(schema.entrySpellings).where(eq(schema.entrySpellings.entryId, entryId))
  if (spellings.length) {
    await tx.insert(schema.entrySpellings).values(spellings.map(s => ({ entryId, form: s, formNormalized: normalizeArabic(s) })))
  }
  return spellings
}

/** An entry's current other spellings, in stored order. */
export async function spellingsOf(tx: Tx, entryId: number): Promise<string[]> {
  const rows = await tx.select({ form: schema.entrySpellings.form, id: schema.entrySpellings.id }).from(schema.entrySpellings)
    .where(eq(schema.entrySpellings.entryId, entryId)).orderBy(schema.entrySpellings.id)
  return rows.map(r => r.form)
}
