import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$, displayName, bio } from '../../utils/validate'

const Body = v.object({ displayName: v.optional(displayName), bio: v.optional(bio) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const [updated] = await db.update(schema.users).set({
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.bio !== undefined && { bio: body.bio || null }),
  }).where(eq(schema.users.id, user.id)).returning()
  await refreshSession(event, updated!)
  return { ok: true }
})
