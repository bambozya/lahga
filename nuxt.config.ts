// https://nuxt.com/docs/api/configuration/nuxt-config
const base = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  // <search> is a native HTML element Vue's tag list does not know yet.
  vue: { compilerOptions: { isCustomElement: tag => tag === 'search' } },
  runtimeConfig: {
    public: {
      // true for the read-only GitHub Pages snapshot (set LAHGA_STATIC=1 at build time)
      staticSite: process.env.LAHGA_STATIC === '1',
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
      ],
      link: [
        // The letter lam from the Amiri logo, white on a black tile (public/favicon.svg is the source).
        { rel: 'icon', href: `${base}/favicon.svg`, type: 'image/svg+xml' },
        { rel: 'icon', href: `${base}/favicon.ico`, sizes: '48x48' },
        { rel: 'apple-touch-icon', href: `${base}/apple-touch-icon.png` },
        // Fonts are self-hosted under public/fonts (see app/assets/css/fonts.css); preload the two that paint first.
        { rel: 'preload', href: `${base}/fonts/amiri-700-arabic.woff2`, as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preload', href: `${base}/fonts/noto-naskh-arabic-400-700-arabic.woff2`, as: 'font', type: 'font/woff2', crossorigin: '' },
      ],
    },
  },
  nitro: {
    // PGlite ships WASM assets; keep it external so the bundler leaves it alone.
    externals: { external: ['@electric-sql/pglite'] },
    prerender: { crawlLinks: true, routes: ['/', '/browse', '/api/words/all'] },
  },
})
