// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Sessions (sealed cookie), password hashing and the OAuth handlers.
  modules: ['nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  // <search> is a native HTML element Vue's tag list does not know yet.
  vue: { compilerOptions: { isCustomElement: tag => tag === 'search' } },
  runtimeConfig: {
    // Secrets come from the environment (NUXT_SESSION_PASSWORD, NUXT_OAUTH_GOOGLE_CLIENT_ID, …);
    // see .env.example. Empty here on purpose.
    session: { maxAge: 60 * 60 * 24 * 30 }, // 30 days
    public: {
      // Canonical origin of the live site; override with NUXT_PUBLIC_SITE_URL.
      siteUrl: 'https://lahga.fyi',
      // Cloudflare Turnstile site key for the registration form; empty disables the widget.
      turnstileSiteKey: '',
      // Set to '1' when NUXT_OAUTH_GOOGLE_CLIENT_ID is configured, so the pages show the Google button.
      googleLogin: '',
      // Self-hosted Umami (docs/REACH.md, Phase R1): cookie-free, and served from
      // our own domain so blockers keyed on a vendor hostname do not strip it.
      // Both are empty/default here and filled from NUXT_PUBLIC_UMAMI_* at run
      // time, so the id can change without rebuilding the image — and with no id
      // the site serves no analytics tag at all rather than one pointed at
      // nothing. Read by app/plugins/analytics.ts and by useAnalytics().
      umamiWebsiteId: '',
      umamiScriptUrl: 'https://analytics.lahga.fyi/script.js',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      // Apply the saved theme before the first paint (see app/components/ThemeSwitch.vue).
      // The analytics tag is not here: anything in app.head is baked in at build
      // time, and the build runs inside Docker without the site's environment,
      // so the tag would be compiled out for good. It is added at runtime
      // instead — see app/plugins/analytics.ts.
      script: [{
        innerHTML: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`,
      }],
      title: 'لهجة - قاموس اللهجات العربية',
      meta: [
        { name: 'description', content: 'لهجة - قاموس اللهجات العربية. اكتشف وشارك كلمات ومصطلحات من مختلف اللهجات العربية.' },
        // Pages set their own through useSeo(); these are the fallbacks.
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
      ],
      link: [
        // The nuqta, the dot of the jeem in the logo, on an ink tile (public/favicon.svg is the source).
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // Fonts are self-hosted under public/fonts (see app/assets/css/fonts.css); preload the two that paint first.
        { rel: 'preload', href: '/fonts/ibm-plex-sans-arabic-400-arabic.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preload', href: '/fonts/noto-naskh-arabic-400-700-arabic.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
      ],
    },
  },
  routeRules: {
    // Security headers on every response. HSTS makes browsers use https for a year
    // once they have seen the site over https; browsers ignore it on plain http.
    '/**': {
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    // Surviving the arrival (docs/REACH.md, Phase R6): nothing was cached
    // before this, so every page view — including every one in a spike — was
    // a database query on one small VPS. stale-while-revalidate serves the
    // last render instantly and refreshes it in the background, so the
    // database sees at most one request per route per window, however many
    // visitors arrive in it.
    //
    // The edit and delete buttons a signed-in author sees are not a problem
    // this has to solve by hand: nuxt-auth-utils already skips folding the
    // session into a response Nitro is caching (it checks the same
    // event.context.cache this relies on) and instead re-fetches it client
    // side right after the cached HTML hydrates, so the buttons still appear
    // a moment later for their owner — verified by reading the module's own
    // session plugins, not assumed. The one thing that module does not cover
    // is application data that itself depends on who is asking — a viewer's
    // own vote, on /api/words/[id] and /api/dialects/[slug] — which is why
    // those two skip that lookup for a cache-warming request instead of
    // baking one visitor's vote into what everyone else is served.
    //
    // /w/* and not /w/**: the edit and history pages live one segment deeper
    // (/w/[id]/edit, /w/[id]/history) and must not be swept in — history
    // shows every past revision and an admin's revert button, and caching
    // either would serve a stale form or a stale moderation view.
    '/': { swr: 60 },
    '/w/*': { swr: 300 },
    '/d/**': { swr: 300 },
    '/divergent': { swr: 900 },
  },
  nitro: {
    // PGlite ships WASM assets, and @resvg/resvg-js (the card renderer, docs/REACH.md
    // Phase R2) is a native binding: both need to stay external so the bundler
    // leaves their binaries alone instead of trying to inline them.
    externals: { external: ['@electric-sql/pglite', '@resvg/resvg-js'] },
    // The card renderer's ttf fonts (server/assets/fonts/*.ttf) are plain files,
    // not imports, so nitro's build tracer would otherwise leave them out of
    // .output entirely. No config needed for this: nitro always auto-mounts the
    // whole server/assets/ directory under storage key "server", which is how
    // server/utils/ogCard.ts reads them back (useStorage('assets').getItemRaw
    // ('server:fonts:<file>')) — verified against a running server, since this
    // auto-mount is not documented as clearly as it is real.
    // Nothing is prerendered: every page reads the live database.
    prerender: { crawlLinks: false, routes: [] },
  },
})
