import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { schema } from '../db'
import type { Tx } from './contribute'

/** The logged-in admin, or a 403. Moderators are not admins yet: the plan keeps moderation admin-only for now. */
export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'هذه الصفحة للمديرين فقط' })
  return user
}

export async function logModeration(tx: Tx, actorId: number, action: string, targetType: string, targetId: number, reason?: string | null) {
  await tx.insert(schema.moderationLog).values({ actorId, action, targetType, targetId, reason: reason || null })
}

export const contentTables = {
  word: schema.words,
  entry: schema.entries,
  link: schema.wordEntryLinks,
  example: schema.examples,
} as const
export type ContentType = keyof typeof contentTables

/** A short human-readable preview of a content row, for the queues. */
export async function describeTarget(tx: Tx, targetType: ContentType, targetId: number) {
  switch (targetType) {
    case 'word': {
      const w = await tx.query.words.findFirst({ where: eq(schema.words.id, targetId) })
      return w ? { text: w.headword, detail: w.definition, status: w.status, wordId: w.id, createdBy: w.createdBy } : null
    }
    case 'entry': {
      const e = await tx.query.entries.findFirst({ where: eq(schema.entries.id, targetId), with: { dialect: true, links: true } })
      return e ? { text: `${e.form} (${e.dialect.nameAr})`, detail: e.meaning, status: e.status, wordId: e.links.find(l => l.status === 'active')?.wordId ?? e.links[0]?.wordId ?? null, createdBy: e.createdBy } : null
    }
    case 'example': {
      const x = await tx.query.examples.findFirst({ where: eq(schema.examples.id, targetId), with: { entry: { with: { links: true } } } })
      return x ? { text: x.text, detail: x.gloss, status: x.status, wordId: x.entry.links[0]?.wordId ?? null, createdBy: x.createdBy } : null
    }
    case 'link': {
      const l = await tx.query.wordEntryLinks.findFirst({ where: eq(schema.wordEntryLinks.id, targetId), with: { word: true, entry: true } })
      return l ? { text: `${l.entry.form} ← ${l.word.headword}`, detail: null, status: l.status, wordId: l.wordId, createdBy: l.createdBy } : null
    }
  }
}

/** Sets a content row's status (active, hidden, deleted) and records it in the revisions and the log. */
export async function setContentStatus(tx: Tx, actorId: number, targetType: ContentType, targetId: number, status: 'active' | 'hidden' | 'deleted', reason?: string | null) {
  const table = contentTables[targetType]
  const [row] = await tx.update(table).set({ status, updatedAt: new Date() }).where(eq(table.id, targetId)).returning({ id: table.id })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'العنصر غير موجود' })
  await recordRevision(tx, targetType, targetId, { status }, actorId, reason)
  await logModeration(tx, actorId, status === 'active' ? 'restore' : status === 'hidden' ? 'hide' : 'delete', targetType, targetId, reason)
}

export function publicUser(u: { id: number, displayName: string, deletedAt: Date | null } | null | undefined) {
  return u && !u.deletedAt ? { id: u.id, displayName: u.displayName } : { id: null, displayName: 'مستخدم محذوف' }
}
