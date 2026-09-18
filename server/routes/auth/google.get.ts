import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { isArabicOnly } from '../../../shared/utils/arabic'

/**
 * Google login. Three cases: the Google account is already linked (log in);
 * a user with the same email exists (link and log in); nobody matches (create).
 * Google has verified the email, so the account counts as verified.
 */
export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: g }) {
    const db = await useDb()
    const email = String(g.email || '').toLowerCase()
    if (!email || g.email_verified === false) {
      return sendRedirect(event, '/login?error=google-email')
    }

    const linked = await db.query.oauthAccounts.findFirst({
      where: and(eq(schema.oauthAccounts.provider, 'google'), eq(schema.oauthAccounts.providerUserId, String(g.sub))),
      with: { user: true },
    })
    let user = linked?.user ?? await db.query.users.findFirst({ where: eq(schema.users.email, email) })
    if (user?.deletedAt) return sendRedirect(event, '/login?error=deleted')
    if (user?.bannedAt) return sendRedirect(event, '/login?error=banned')

    if (!user) {
      // Google names are usually Latin; the site's names are Arabic. Fall back to a placeholder the user changes in settings.
      const name = typeof g.name === 'string' && g.name.trim() && isArabicOnly(g.name) ? g.name.trim().slice(0, 40) : 'مستخدم جديد'
      ;[user] = await db.insert(schema.users).values({
        email, displayName: name, emailVerifiedAt: new Date(), avatarUrl: typeof g.picture === 'string' ? g.picture : null,
      }).returning()
    } else if (!user.emailVerifiedAt) {
      ;[user] = await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, user.id)).returning()
    }
    if (!linked) {
      await db.insert(schema.oauthAccounts).values({ userId: user!.id, provider: 'google', providerUserId: String(g.sub) })
    }

    await login(event, user!)
    return sendRedirect(event, user!.displayName === 'مستخدم جديد' ? '/settings?welcome=1' : '/')
  },
  onError(event, error) {
    console.error('[lahga] google login failed', error)
    return sendRedirect(event, '/login?error=google')
  },
})
