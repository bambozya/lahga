/**
 * Custom events on top of Umami's automatic pageview tracking (docs/REACH.md,
 * Phase R1). Safe to call unconditionally from anywhere: it is a no-op when
 * the site has no analytics id configured, when Umami's script failed to load
 * (blocked, offline), or during SSR where `window` does not exist.
 */
export function useAnalytics() {
  const enabled = !!useRuntimeConfig().public.umamiWebsiteId

  function trackEvent(name: string, data?: Record<string, string | number | boolean>) {
    if (!enabled || typeof window === 'undefined') return
    try {
      ;(window as any).umami?.track(name, data)
    } catch { /* never let analytics break the page */ }
  }

  return { trackEvent }
}
