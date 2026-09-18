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
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      // Apply the saved theme before the first paint (see app/components/ThemeSwitch.vue).
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
  },
  nitro: {
    // PGlite ships WASM assets; keep it external so the bundler leaves it alone.
    externals: { external: ['@electric-sql/pglite'] },
    // Nothing is prerendered: every page reads the live database.
    prerender: { crawlLinks: false, routes: [] },
  },
})
