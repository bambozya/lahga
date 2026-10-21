/**
 * Fails on purpose, so an admin can check that a server error reaches the
 * inbox (server/plugins/error-mail.ts, docs/ROADMAP.md A3): open
 * /api/admin/test-error while signed in, then look for the mail.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  throw new Error('Test error: /api/admin/test-error was opened on purpose')
})
