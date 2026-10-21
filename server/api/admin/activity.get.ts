import { and, count, countDistinct, gt, isNotNull, ne, notInArray, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { useDb, schema } from '../../db'
import { systemUserId } from '../../utils/importer'

/** How many weeks the table goes back. */
const WEEKS = 8

/**
 * Who is using the site, week by week, for the admin's "الأرقام" page
 * (docs/ROADMAP.md D1): registrations, verified accounts, what people outside
 * the team contributed, votes, flags and proposals.
 *
 * A week is a rolling seven days ending now, not a calendar week, so "the last
 * week" is always a full one. Row 0 is the last seven days, row 1 the seven
 * before, and so on.
 *
 * "Outside the team" means neither the system account (imports, seed work) nor
 * an admin. A contribution is a row in `revisions`: every create and edit of a
 * word, form, link or example writes one, with its author.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await useDb()
  const system = await systemUserId(db)

  const week = (col: AnyColumn) => sql<number>`floor(extract(epoch from now() - ${col}) / 604800)::int`.mapWith(Number)
  const recent = (col: AnyColumn) => gt(col, sql`now() - make_interval(days => ${WEEKS * 7})`)
  const team = db.select({ id: schema.users.id }).from(schema.users)
    .where(sql`${schema.users.id} = ${system} or ${schema.users.role} = 'admin'`)

  const perWeek = (table: PgTable, col: AnyColumn, extra?: SQL) =>
    db.select({ week: week(col), n: count() }).from(table).where(and(recent(col), extra)).groupBy(week(col))

  const [registered, verified, contributions, memberVotes, guestVotes, flags, proposals, everContributors] = await Promise.all([
    perWeek(schema.users, schema.users.createdAt, ne(schema.users.id, system)),
    perWeek(schema.users, schema.users.emailVerifiedAt, and(isNotNull(schema.users.emailVerifiedAt), ne(schema.users.id, system))!),
    db.select({ week: week(schema.revisions.createdAt), n: count(), people: countDistinct(schema.revisions.authorId) })
      .from(schema.revisions)
      .where(and(recent(schema.revisions.createdAt), isNotNull(schema.revisions.authorId), notInArray(schema.revisions.authorId, team)))
      .groupBy(week(schema.revisions.createdAt)),
    perWeek(schema.votes, schema.votes.createdAt),
    perWeek(schema.guestVotes, schema.guestVotes.createdAt),
    perWeek(schema.flags, schema.flags.createdAt),
    perWeek(schema.proposals, schema.proposals.createdAt),
    db.select({ n: countDistinct(schema.revisions.authorId) }).from(schema.revisions)
      .where(and(isNotNull(schema.revisions.authorId), notInArray(schema.revisions.authorId, team))),
  ])

  const at = (rows: { week: number, n: number }[], i: number) => Number(rows.find(r => r.week === i)?.n ?? 0)
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const c = contributions.find(r => r.week === i)
    return {
      ago: i,
      registered: at(registered, i),
      verified: at(verified, i),
      contributors: Number(c?.people ?? 0),
      contributions: Number(c?.n ?? 0),
      votes: at(memberVotes, i),
      guestVotes: at(guestVotes, i),
      flags: at(flags, i),
      proposals: at(proposals, i),
    }
  })

  return { weeks, contributorsEver: Number(everContributors[0]?.n ?? 0) }
})
