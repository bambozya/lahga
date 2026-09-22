/**
 * Google login switches itself on: when NUXT_OAUTH_GOOGLE_CLIENT_ID is set, the
 * pages get the button, and the callback address is derived from the site URL so
 * it does not have to be typed a second time (the app sits behind Coolify's proxy
 * and cannot always tell its own public address).
 *
 * Runs per request because Nitro hands every request its own copy of the config.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const google = config.oauth?.google
  if (!google?.clientId) return
  config.public.googleLogin = '1'
  if (!google.redirectURL) google.redirectURL = `${config.public.siteUrl}/auth/google`
})
