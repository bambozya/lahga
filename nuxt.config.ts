// https://nuxt.com/docs/api/configuration/nuxt-config

// Self-hosted Umami (docs/REACH.md, Phase R1): cookie-free, served from our own
// domain so ad/tracker blockers that key on a third-party hostname do not strip
// it. Read directly from the environment (not runtimeConfig) so the <script>
// tag itself is only emitted once an id is actually configured; unset in dev
// and on any deploy that hasn't been given one, the site ships with no
// analytics call at all rather than one pointed at an empty id.
const umamiWebsiteId = process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID ?? ''
const umamiScriptUrl = process.env.NUXT_PUBLIC_UMAMI_SCRIPT_URL ?? 'https://analytics.lahga.fyi/script.js'

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
      // Empty unless NUXT_PUBLIC_UMAMI_WEBSITE_ID is set; read by useAnalytics() to
      // know whether window.umami exists, so custom events no-op safely without it.
      umamiWebsiteId,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      // Apply the saved theme before the first paint (see app/components/ThemeSwitch.vue).
      script: [
        {
          innerHTML: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`,
        },
        // Umami's own script tracks pageviews (and referrers) automatically;
        // useAnalytics() adds custom events (share, game finished, …) on top.
        // data-domains scopes it to the real domain so a stray env var never
        // counts dev or preview traffic.
        ...(umamiWebsiteId
          ? [{ src: umamiScriptUrl, defer: true, 'data-website-id': umamiWebsiteId, 'data-domains': 'lahga.fyi' }]
          : []),
      ],
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
