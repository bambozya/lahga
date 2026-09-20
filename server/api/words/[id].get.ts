import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'

/**
 * A word page: the MSA hub plus its linked entries grouped by dialect, with
 * examples. Reached by id or by slug (docs/REACH.md, Phase R5) — a
 * numbers-only param is looked up by id so /w/123 keeps answering forever,
 * anything else by slug; the page itself is what turns a match found by the
 * old id into a redirect to the slug it returns.
 */
export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'id')!
  const db = await useDb()

  const word = await db.query.words.findFirst({
    where: /^\d+$/.test(param) ? eq(schema.words.id, Number(param)) : eq(schema.words.slug, param),
    with: {
      links: {
        with: {
          entry: { with: { dialect: { with: { parent: true } }, examples: true, author: true } },
        },
      },
    },
  })
  if (!word || word.status !== 'active') throw createError({ statusCode: 404, statusMessage: 'الكلمة غير موجودة' })

  // A cache-warming request (docs/REACH.md, Phase R6) has no one real viewer:
  // the session is skipped rather than baked into a response every later
  // visitor will be served, and every myVote below is left at its 0 default.
  const { user } = event.context.cache ? { user: undefined } : await getUserSession(event)
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

  // One block per region, in the order the result cards read them too.
  const groupList = groupByRegion(entries)
  return {
    id: word.id, slug: word.slug, headword: word.headword, definition: word.definition, kind: word.kind, score: word.score,
    createdAt: word.createdAt, createdBy: word.createdBy,
    groups: groupList,
  }
})
