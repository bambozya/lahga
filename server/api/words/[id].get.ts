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
          entry: { with: { dialect: { with: { parent: true } }, examples: true, author: true } },
        },
      },
    },
  })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  const { user } = await getUserSession(event)
  const activeLinks = word.links.filter(l => l.status === 'active' && l.entry.status === 'active')
  const [entryVotes, exampleVotes] = await Promise.all([
    myVotes(db, user?.id, 'entry', activeLinks.map(l => l.entry.id)),
    myVotes(db, user?.id, 'example', activeLinks.flatMap(l => l.entry.examples.map(x => x.id))),
  ])

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
      myVote: entryVotes[l.entry.id] ?? 0,
      rank: wilson(l.entry.upvotes, l.entry.downvotes),
      createdBy: l.entry.createdBy,
      author: l.entry.author && !l.entry.author.deletedAt ? { id: l.entry.author.id, displayName: l.entry.author.displayName } : null,
      dialect: { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
      group: l.entry.dialect.parent
        ? { slug: l.entry.dialect.parent.slug, nameAr: l.entry.dialect.parent.nameAr }
        : { slug: l.entry.dialect.slug, nameAr: l.entry.dialect.nameAr },
      examples: l.entry.examples
        .filter(x => x.status === 'active')
        .sort((a, b) => b.score - a.score)
        .map(x => ({ id: x.id, text: x.text, gloss: x.gloss, score: x.score, myVote: exampleVotes[x.id] ?? 0, createdBy: x.createdBy })),
    }))
    // Best-supported entries first: the Wilson lower bound rewards agreement, not just volume.
    .sort((a, b) => b.rank - a.rank || b.score - a.score || a.id - b.id)

  // Group by top-level dialect so the page reads "one block per region".
  const groups: Record<string, { slug: string, nameAr: string, entries: typeof entries }> = {}
  for (const e of entries) {
    groups[e.group.slug] ??= { ...e.group, entries: [] }
    groups[e.group.slug]!.entries.push(e)
  }

  // Regions ordered by their best entry, so the strongest evidence comes first.
  const groupList = Object.values(groups).sort((a, b) => (b.entries[0]?.rank ?? 0) - (a.entries[0]?.rank ?? 0))
  return {
    id: word.id, headword: word.headword, definition: word.definition, kind: word.kind, score: word.score,
    createdAt: word.createdAt, createdBy: word.createdBy,
    groups: groupList,
  }
})
