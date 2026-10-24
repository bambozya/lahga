import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { MIN_ENTRIES } from '../../../shared/config/rules'
import { entryCounts } from '../../utils/dialects'

/**
 * The dialect tree: active top-level groups, each with its active children.
 * Only the first paragraph of each description travels — the list pages show
 * no more than that, and the dialect page fetches its own full text.
 *
 * A sub-dialect with no words yet is left out. The tree is a promise about what
 * is in the dictionary, and a name that leads to an empty page is a promise
 * broken; بغدادي comes back by itself the moment someone files a word under it.
 *
 * ?all=1 returns every active dialect regardless, each child carrying how many
 * words it holds. Two pages want that: the contribution form, since the first
 * word has to be filed from somewhere, and /dialects, which is the map of the
 * whole language and says plainly which corners of it are still empty.
 */
export default defineEventHandler(async (event) => {
  const { all } = getQuery(event)
  const db = await useDb()
  const rows = await db.select().from(schema.dialects)
    .where(eq(schema.dialects.active, 1))
    .orderBy(asc(schema.dialects.sortOrder))

  const counted = await entryCounts(db)
  const summary = (t: string | null) => (t ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
  const top = rows.filter(r => r.parentId === null)
  return top.map(g => ({
    id: g.id, slug: g.slug, nameAr: g.nameAr, summaryAr: summary(g.descriptionAr),
    children: rows
      .filter(r => r.parentId === g.id && (all || (counted.get(r.id) ?? 0) >= MIN_ENTRIES))
      .map(c => ({ id: c.id, slug: c.slug, nameAr: c.nameAr, words: counted.get(c.id) ?? 0 })),
  }))
})

