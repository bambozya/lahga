/**
 * Adds the Umami tag at runtime rather than at build time (docs/REACH.md,
 * Phase R1).
 *
 * It cannot live in nuxt.config's app.head: that is evaluated when the image is
 * built, and the build runs inside Docker without the site's environment, so a
 * tag conditional on an environment variable there is compiled out for good and
 * no amount of setting the variable afterwards brings it back. Reading
 * runtimeConfig here instead means the id is picked up when the server starts,
 * so it can be set, changed or removed without rebuilding.
 *
 * Runs on the server too, so the tag is in the delivered HTML rather than
 * appearing only after hydration. With no id configured nothing is added at
 * all: no request, no tag, nothing to strip.
 */
export default defineNuxtPlugin(() => {
  const { umamiWebsiteId, umamiScriptUrl } = useRuntimeConfig().public
  if (!umamiWebsiteId) return

  useHead({
    script: [{
      src: umamiScriptUrl,
      defer: true,
      'data-website-id': umamiWebsiteId,
      // Scopes counting to the real domain, so a stray id in a dev or preview
      // environment never pollutes the numbers.
      'data-domains': 'lahga.fyi',
    }],
  })
})
