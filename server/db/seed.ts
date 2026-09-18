import type { Db } from './index'
import * as schema from './schema'
import { dialectTree, sampleWords, type DialectSeed } from './seed-data'
import { normalizeArabic } from '../../shared/utils/arabic'

/** Inserts the dialect tree and sample words if the database is empty. */
export async function seedIfEmpty(db: Db): Promise<void> {
  const existing = await db.select({ id: schema.dialects.id }).from(schema.dialects).limit(1)
  if (existing.length) return

  console.log('[lahga] empty database, seeding dialects and sample words')

  const idBySlug = new Map<string, number>()
  let order = 0
  const insertDialects = async (list: DialectSeed[], parentId: number | null) => {
    for (const d of list) {
      const [row] = await db.insert(schema.dialects).values({
        slug: d.slug,
        nameAr: d.nameAr,
        descriptionAr: d.descriptionAr ?? null,
        parentId,
        sortOrder: order++,
        active: d.active === false ? 0 : 1,
      }).returning({ id: schema.dialects.id })
      idBySlug.set(d.slug, row!.id)
      if (d.children) await insertDialects(d.children, row!.id)
    }
  }
  await insertDialects(dialectTree, null)

  for (const w of sampleWords) {
    const [word] = await db.insert(schema.words).values({
      headword: w.headword,
      headwordNormalized: normalizeArabic(w.headword),
      definition: w.definition,
    }).returning({ id: schema.words.id })

    for (const e of w.entries) {
      const dialectId = idBySlug.get(e.dialect)
      if (!dialectId) throw new Error(`seed: unknown dialect ${e.dialect}`)
      const [entry] = await db.insert(schema.entries).values({
        dialectId,
        form: e.form,
        formNormalized: normalizeArabic(e.form),
        meaning: e.meaning,
      }).returning({ id: schema.entries.id })
      await db.insert(schema.wordEntryLinks).values({ wordId: word!.id, entryId: entry!.id, score: 1 })
      for (const text of e.examples ?? []) {
        await db.insert(schema.examples).values({ entryId: entry!.id, text })
      }
    }
  }
  console.log('[lahga] seed complete')
}

/**
 * Local development only (the embedded PGlite database): makes sure an admin
 * account exists, so nobody has to fish a verification link out of the
 * terminal. Credentials come from .env (DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD,
 * DEV_ADMIN_NAME) with harmless defaults. Never called with DATABASE_URL set.
 */
export async function ensureDevAdmin(db: Db): Promise<void> {
  const email = (process.env.DEV_ADMIN_EMAIL || 'admin@lahga.test').toLowerCase()
  const password = process.env.DEV_ADMIN_PASSWORD || 'lahga1234'
  const displayName = process.env.DEV_ADMIN_NAME || 'المدير المحلي'
  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) })
  if (existing) return
  await db.insert(schema.users).values({
    email, displayName, role: 'admin', emailVerifiedAt: new Date(), passwordHash: await hashPassword(password),
  })
  console.log(`[lahga] local admin ready: ${email} / ${password}`)
}
