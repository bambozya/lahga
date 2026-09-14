import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/** A word page: the MSA hub plus its linked entries grouped by dialect, with examples. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })
  const db = await useDb()

  const word = await db.query.words.findFirst({
    where: eq(schema.words.id, id),
    with: {
      links: {
        with: {
          entry: { with: { dialect: { with: { parent: true } }, examples: true } },
        },
      },
    },
  })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  const entries = word.links
    .filter(l => l.status === 'active' && l.entry.status === 'active')
    .map(l => ({
      linkId: l.id,
      linkScore: l.score,
      id: l.entry.id,
      form: l.entry.form,
      meaning: l.entry.meaning,
      notes: l.entry.notes,
      score: l.entry.score,
      dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
      group: l.entry.dialect.parent
        ? { slug: l.entry.dialect.parent.slug, nameAr: l.entry.dialect.parent.nameAr }
        : { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
      examples: l.entry.examples
        .filter(x => x.status === 'active')
        .sort((a, b) => b.score - a.score)
        .map(x => ({ id: x.id, text: x.text, gloss: x.gloss, score: x.score })),
    }))
    .sort((a, b) => b.linkScore - a.linkScore || b.score - a.score)

  // Group by top-level dialect so the page reads "one block per region".
  const groups: Record<string, { slug: string, nameAr: string, entries: typeof entries }> = {}
  for (const e of entries) {
    groups[e.group.slug] ??= { ...e.group, entries: [] }
    groups[e.group.slug]!.entries.push(e)
  }

  return {
    id: word.id, headword: word.headword, definition: word.definition, score: word.score, createdAt: word.createdAt,
    groups: Object.values(groups),
  }
})
