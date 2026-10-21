import { defineConfig } from 'vitest/config'

// Tests guard the rules, not the pages (docs/ROADMAP.md, decision 3).
// tests/unit: pure functions, milliseconds. tests/smoke: boots the built app
// (`npm run build` first) and fetches a handful of pages.
export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10_000,
  },
})
